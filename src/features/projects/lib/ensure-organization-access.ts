import { and, eq } from "drizzle-orm"
import {
  organizationMembershipTable,
  organizationTable,
} from "@/features/auth/db"
import { db } from "@/lib/db"

type EnsureOrganizationAccessParams = {
  organizationSlug: string
  userId: string
}

export const ensureOrganizationAccess = async ({
  organizationSlug,
  userId,
}: EnsureOrganizationAccessParams) =>
  db
    .select({
      id: organizationTable.id,
      name: organizationTable.name,
      slug: organizationTable.slug,
    })
    .from(organizationMembershipTable)
    .innerJoin(
      organizationTable,
      eq(organizationMembershipTable.organizationId, organizationTable.id),
    )
    .where(
      and(
        eq(organizationMembershipTable.userId, userId),
        eq(organizationTable.slug, organizationSlug),
      ),
    )
    .then((rows) => rows[0] ?? null)
