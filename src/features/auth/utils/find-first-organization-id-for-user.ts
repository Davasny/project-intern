import { asc, eq } from "drizzle-orm"
import { organizationMembershipTable } from "@/features/auth/db"
import { db } from "@/lib/db"

export const findFirstOrganizationIdForUser = async (userId: string) => {
  const firstMembership = await db
    .select({ organizationId: organizationMembershipTable.organizationId })
    .from(organizationMembershipTable)
    .where(eq(organizationMembershipTable.userId, userId))
    .orderBy(asc(organizationMembershipTable.createdAt))
    .then((rows) => rows[0] ?? null)

  return firstMembership?.organizationId ?? null
}
