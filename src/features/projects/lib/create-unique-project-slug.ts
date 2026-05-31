import { and, eq, ne } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"
import { createSlug } from "@/utils/create-slug"

type CreateUniqueProjectSlugParams = {
  displayName: string
  excludedProjectId: string | null
  organizationId: string
}

export const createUniqueProjectSlug = async ({
  displayName,
  excludedProjectId,
  organizationId,
}: CreateUniqueProjectSlugParams) => {
  const baseSlug = createSlug(displayName)
  const whereClause = excludedProjectId
    ? and(
        eq(projectTable.organizationId, organizationId),
        ne(projectTable.id, excludedProjectId),
      )
    : eq(projectTable.organizationId, organizationId)

  const existingProjects = await db
    .select({ slug: projectTable.slug })
    .from(projectTable)
    .where(whereClause)

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
