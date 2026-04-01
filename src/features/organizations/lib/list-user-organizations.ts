import { asc, eq } from "drizzle-orm"
import {
  organizationMembershipTable,
  organizationTable,
} from "@/features/auth/db"
import { db } from "@/lib/db"

export const listUserOrganizations = async (userId: string) =>
  db
    .select({
      id: organizationTable.id,
      name: organizationTable.name,
      role: organizationMembershipTable.role,
      slug: organizationTable.slug,
    })
    .from(organizationMembershipTable)
    .innerJoin(
      organizationTable,
      eq(organizationMembershipTable.organizationId, organizationTable.id),
    )
    .where(eq(organizationMembershipTable.userId, userId))
    .orderBy(asc(organizationTable.createdAt))
