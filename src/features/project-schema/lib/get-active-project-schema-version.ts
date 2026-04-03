import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type GetActiveProjectSchemaVersionParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

const createInitialProjectSchemaVersion = async (projectId: string) => {
  const schemaDefinition = validateProjectSchemaDefinition([])
  const [createdSchemaVersion] = await db
    .insert(projectSchemaVersionTable)
    .values({
      projectId,
      proposedBy: null,
      schemaDefinition,
      state: "accepted",
      version: 1,
    })
    .returning({
      id: projectSchemaVersionTable.id,
      projectId: projectSchemaVersionTable.projectId,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      state: projectSchemaVersionTable.state,
      version: projectSchemaVersionTable.version,
    })

  await db
    .update(projectTable)
    .set({ activeSchemaVersionId: createdSchemaVersion.id })
    .where(eq(projectTable.id, projectId))

  return createdSchemaVersion
}

export const getActiveProjectSchemaVersion = async ({
  organizationSlug,
  projectSlug,
  userId,
}: GetActiveProjectSchemaVersionParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  if (project.activeSchemaVersionId) {
    const activeSchemaVersion = await db
      .select({
        id: projectSchemaVersionTable.id,
        parentVersionId: projectSchemaVersionTable.parentVersionId,
        projectId: projectSchemaVersionTable.projectId,
        schemaDefinition: projectSchemaVersionTable.schemaDefinition,
        state: projectSchemaVersionTable.state,
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
      state: projectSchemaVersionTable.state,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(
      and(
        eq(projectSchemaVersionTable.projectId, project.id),
        eq(projectSchemaVersionTable.state, "accepted"),
      ),
    )
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
    parentVersionId: null,
    project,
  }
}
