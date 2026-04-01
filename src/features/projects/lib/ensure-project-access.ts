import { and, eq } from "drizzle-orm"
import {
  organizationMembershipTable,
  organizationTable,
} from "@/features/auth/db"
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
      displayName: projectTable.displayName,
      id: projectTable.id,
      organizationId: organizationTable.id,
      organizationSlug: organizationTable.slug,
      slug: projectTable.slug,
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
