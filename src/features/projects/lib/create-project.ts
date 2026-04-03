import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
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

  return db.transaction(async (transaction) => {
    const [project] = await transaction
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

    const [schemaVersion] = await transaction
      .insert(projectSchemaVersionTable)
      .values({
        projectId: project.id,
        proposedBy: null,
        schemaDefinition: validateProjectSchemaDefinition([]),
        state: "accepted",
        version: 1,
      })
      .returning({
        id: projectSchemaVersionTable.id,
      })

    await transaction
      .update(projectTable)
      .set({ activeSchemaVersionId: schemaVersion.id })
      .where(eq(projectTable.id, project.id))

    return project
  })
}
