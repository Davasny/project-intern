import { and, eq } from "drizzle-orm"
import { organization, organizationMembership } from "@/features/auth/db"
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
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organizationMembership)
    .innerJoin(
      organization,
      eq(organizationMembership.organizationId, organization.id),
    )
    .where(
      and(
        eq(organizationMembership.userId, userId),
        eq(organization.slug, organizationSlug),
      ),
    )
    .then((rows) => rows[0] ?? null)
