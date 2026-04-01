import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

const createInitialProjectSchemaVersion = async (projectId: string) => {
  const schemaDefinition = validateProjectSchemaDefinition([])

  const [createdSchemaVersion] = await db
    .insert(projectSchemaVersionTable)
    .values({
      projectId,
      schemaDefinition,
      version: 1,
    })
    .returning({
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      projectId: projectSchemaVersionTable.projectId,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      version: projectSchemaVersionTable.version,
    })

  await db
    .update(projectTable)
    .set({ activeSchemaVersionId: createdSchemaVersion.id })
    .where(eq(projectTable.id, projectId))

  return createdSchemaVersion
}

type GetActiveProjectSchemaVersionByProjectIdParams = {
  projectId: string
}

export const getActiveProjectSchemaVersionByProjectId = async ({
  projectId,
}: GetActiveProjectSchemaVersionByProjectIdParams) => {
  const project = await db
    .select({
      activeSchemaVersionId: projectTable.activeSchemaVersionId,
      displayName: projectTable.displayName,
      id: projectTable.id,
      organizationId: projectTable.organizationId,
      slug: projectTable.slug,
    })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project was not found.",
    })
  }

  if (project.activeSchemaVersionId) {
    const activeSchemaVersion = await db
      .select({
        id: projectSchemaVersionTable.id,
        parentVersionId: projectSchemaVersionTable.parentVersionId,
        projectId: projectSchemaVersionTable.projectId,
        schemaDefinition: projectSchemaVersionTable.schemaDefinition,
        version: projectSchemaVersionTable.version,
      })
      .from(projectSchemaVersionTable)
      .where(eq(projectSchemaVersionTable.id, project.activeSchemaVersionId))
      .then((rows) => rows[0] ?? null)

    if (activeSchemaVersion) {
      return {
        ...activeSchemaVersion,
        project,
      }
    }
  }

  const latestSchemaVersion = await db
    .select({
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      projectId: projectSchemaVersionTable.projectId,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(eq(projectSchemaVersionTable.projectId, project.id))
    .orderBy(desc(projectSchemaVersionTable.version))
    .then((rows) => rows[0] ?? null)

  if (latestSchemaVersion) {
    await db
      .update(projectTable)
      .set({ activeSchemaVersionId: latestSchemaVersion.id })
      .where(eq(projectTable.id, project.id))

    return {
      ...latestSchemaVersion,
      project,
    }
  }

  return {
    ...(await createInitialProjectSchemaVersion(project.id)),
    project,
  }
}
