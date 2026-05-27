import { and, eq } from "drizzle-orm"
import { organization, organizationMembership } from "@/features/auth/db"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

type EnsureProjectAccessParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const ensureProjectAccess = async ({
  organizationSlug,
  projectSlug,
  userId,
}: EnsureProjectAccessParams) =>
  db
    .select({
      activeSchemaVersionId: projectTable.activeSchemaVersionId,
      defaultTemperature: projectTable.defaultTemperature,
      displayName: projectTable.displayName,
      id: projectTable.id,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      slug: projectTable.slug,
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
