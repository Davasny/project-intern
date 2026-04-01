import { and, eq } from "drizzle-orm"
import { organization, organizationMembership } from "@/features/auth/db"
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
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      projectDisplayName: projectTable.displayName,
      projectId: projectTable.id,
      projectSlug: projectTable.slug,
    })
    .from(organizationMembership)
    .innerJoin(
      organization,
      eq(organizationMembership.organizationId, organization.id),
    )
    .innerJoin(projectTable, eq(projectTable.organizationId, organization.id))
    .where(
      and(
        eq(organizationMembership.userId, userId),
        eq(organization.slug, organizationSlug),
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
