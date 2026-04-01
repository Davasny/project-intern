import { asc, eq } from "drizzle-orm"
import { organizationMembership } from "@/features/auth/db"
import { db } from "@/lib/db"

export const findFirstOrganizationIdForUser = async (userId: string) => {
  const firstMembership = await db
    .select({ organizationId: organizationMembership.organizationId })
    .from(organizationMembership)
    .where(eq(organizationMembership.userId, userId))
    .orderBy(asc(organizationMembership.createdAt))
    .then((rows) => rows[0] ?? null)

  return firstMembership?.organizationId ?? null
}
