import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { ensureOrganizationAccess } from "@/features/projects/lib/ensure-organization-access"
import { db } from "@/lib/db"
import { createSlug } from "@/utils/create-slug"

type CreateProjectParams = {
  displayName: string
  organizationSlug: string
  userId: string
}

const createUniqueProjectSlug = async (
  organizationId: string,
  displayName: string,
) => {
  const baseSlug = createSlug(displayName)
  const existingProjects = await db
    .select({ slug: projectTable.slug })
    .from(projectTable)
    .where(eq(projectTable.organizationId, organizationId))

  if (existingProjects.every((project) => project.slug !== baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  let nextSlug = `${baseSlug}-${suffix}`

  while (existingProjects.some((project) => project.slug === nextSlug)) {
    suffix += 1
    nextSlug = `${baseSlug}-${suffix}`
  }

  return nextSlug
}

export const createProject = async ({
  displayName,
  organizationSlug,
  userId,
}: CreateProjectParams) => {
  const organization = await ensureOrganizationAccess({
    organizationSlug,
    userId,
  })

  if (!organization) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization.",
    })
  }

  const projectSlug = await createUniqueProjectSlug(
    organization.id,
    displayName,
  )
  const [project] = await db
    .insert(projectTable)
    .values({
      displayName,
      organizationId: organization.id,
      slug: projectSlug,
    })
    .returning({
      displayName: projectTable.displayName,
      id: projectTable.id,
      slug: projectTable.slug,
    })

  return project
}
