import { eq } from "drizzle-orm"
import { organizationMembership, user } from "@/features/auth/db"
import { db } from "@/lib/db"

type EnsureSystemUserForOrgParams = {
  organizationId: string
}

const buildSystemUserEmail = (organizationId: string) =>
  `system+${organizationId}@project-intern.local`

export const ensureSystemUserForOrg = async ({
  organizationId,
}: EnsureSystemUserForOrgParams) => {
  const email = buildSystemUserEmail(organizationId)
  const now = new Date()

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))

  if (existingUser) {
    await db
      .insert(organizationMembership)
      .values({
        createdAt: now,
        organizationId,
        role: "owner",
        userId: existingUser.id,
      })
      .onConflictDoNothing()

    return { systemUserId: existingUser.id }
  }

  const [createdUser] = await db
    .insert(user)
    .values({
      createdAt: now,
      email,
      isAnonymous: true,
      name: "System Agent",
      updatedAt: now,
    })
    .returning({ id: user.id })

  await db.insert(organizationMembership).values({
    createdAt: now,
    organizationId,
    role: "owner",
    userId: createdUser.id,
  })

  return { systemUserId: createdUser.id }
}
