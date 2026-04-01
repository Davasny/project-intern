import { asc, eq } from "drizzle-orm"
import { organization, organizationMembership } from "@/features/auth/db"
import { db } from "@/lib/db"

export const listUserOrganizations = async (userId: string) =>
  db
    .select({
      id: organization.id,
      name: organization.name,
      role: organizationMembership.role,
      slug: organization.slug,
    })
    .from(organizationMembership)
    .innerJoin(
      organization,
      eq(organizationMembership.organizationId, organization.id),
    )
    .where(eq(organizationMembership.userId, userId))
    .orderBy(asc(organization.createdAt))
