import { eq, like } from "drizzle-orm"
import {
  organizationMembershipTable,
  organizationTable,
} from "@/features/auth/db"
import { buildPersonalOrganizationName } from "@/features/auth/utils/build-personal-organization-name"
import { db } from "@/lib/db"
import { createSlug } from "@/utils/create-slug"

type EnsureUserOrganizationParams = {
  isAnonymous: boolean
  userEmail: string
  userId: string
  userName: string
}

const createUniqueOrganizationSlug = async (organizationName: string) => {
  const baseSlug = createSlug(organizationName)
  const slugPrefix = `${baseSlug}-personal`
  const existingOrganizations = await db
    .select({ slug: organizationTable.slug })
    .from(organizationTable)
    .where(like(organizationTable.slug, `${slugPrefix}%`))

  if (existingOrganizations.length === 0) {
    return slugPrefix
  }

  let suffix = existingOrganizations.length + 1
  let nextSlug = `${slugPrefix}-${suffix}`

  while (
    existingOrganizations.some((organization) => organization.slug === nextSlug)
  ) {
    suffix += 1
    nextSlug = `${slugPrefix}-${suffix}`
  }

  return nextSlug
}

export const ensureUserOrganization = async ({
  isAnonymous,
  userEmail,
  userId,
  userName,
}: EnsureUserOrganizationParams) => {
  const existingMembership = await db
    .select({ organizationId: organizationMembershipTable.organizationId })
    .from(organizationMembershipTable)
    .where(eq(organizationMembershipTable.userId, userId))
    .then((rows) => rows[0] ?? null)

  if (existingMembership) {
    return existingMembership.organizationId
  }

  const organizationName = buildPersonalOrganizationName({
    isAnonymous,
    userEmail,
    userName,
  })
  const organizationSlug = await createUniqueOrganizationSlug(organizationName)

  return db.transaction(async (transaction) => {
    const [organization] = await transaction
      .insert(organizationTable)
      .values({
        name: organizationName,
        slug: organizationSlug,
        metadata: {
          bootstrapSource: "first-login",
          isPersonal: true,
        },
      })
      .returning({ id: organizationTable.id })

    await transaction.insert(organizationMembershipTable).values({
      organizationId: organization.id,
      role: "owner",
      userId,
    })

    return organization.id
  })
}
