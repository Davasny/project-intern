import { and, eq } from "drizzle-orm"
import {
  organizationMembershipTable,
  organizationTable,
} from "@/features/auth/db"
import { listUserOrganizations } from "@/features/organizations/lib/list-user-organizations"
import { projectTable } from "@/features/projects/db"
import { listOrganizationProjectsById } from "@/features/projects/lib/list-organization-projects-by-id"
import { db } from "@/lib/db"

type ResolveProjectAccessParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const resolveProjectAccess = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ResolveProjectAccessParams) => {
  const currentScope = await db
    .select({
      organizationId: organizationTable.id,
      organizationName: organizationTable.name,
      organizationSlug: organizationTable.slug,
      projectDisplayName: projectTable.displayName,
      projectId: projectTable.id,
      projectSlug: projectTable.slug,
    })
    .from(organizationMembershipTable)
    .innerJoin(
      organizationTable,
      eq(organizationMembershipTable.organizationId, organizationTable.id),
    )
    .innerJoin(
      projectTable,
      eq(projectTable.organizationId, organizationTable.id),
    )
    .where(
      and(
        eq(organizationMembershipTable.userId, userId),
        eq(organizationTable.slug, organizationSlug),
        eq(projectTable.slug, projectSlug),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!currentScope) {
    return null
  }

  const organizations = await listUserOrganizations(userId)
  const projects = await listOrganizationProjectsById(
    currentScope.organizationId,
  )

  return {
    currentOrganization: {
      id: currentScope.organizationId,
      name: currentScope.organizationName,
      slug: currentScope.organizationSlug,
    },
    currentProject: {
      displayName: currentScope.projectDisplayName,
      id: currentScope.projectId,
      slug: currentScope.projectSlug,
    },
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })),
    projects,
  }
}
