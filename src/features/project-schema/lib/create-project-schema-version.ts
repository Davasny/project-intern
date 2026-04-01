import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type CreateProjectSchemaVersionParams = {
  customFields: unknown[]
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createProjectSchemaVersion = async ({
  customFields,
  organizationSlug,
  projectSlug,
  userId,
}: CreateProjectSchemaVersionParams) => {
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

  const schemaDefinition = validateProjectSchemaDefinition(customFields)

  return db.transaction(async (transaction) => {
    const latestSchemaVersion = await transaction
      .select({
        id: projectSchemaVersionTable.id,
        version: projectSchemaVersionTable.version,
      })
      .from(projectSchemaVersionTable)
      .where(eq(projectSchemaVersionTable.projectId, project.id))
      .orderBy(desc(projectSchemaVersionTable.version))
      .then((rows) => rows[0] ?? null)

    const [createdSchemaVersion] = await transaction
      .insert(projectSchemaVersionTable)
      .values({
        parentVersionId: latestSchemaVersion?.id ?? null,
        projectId: project.id,
        schemaDefinition,
        version: (latestSchemaVersion?.version ?? 0) + 1,
      })
      .returning({
        id: projectSchemaVersionTable.id,
        parentVersionId: projectSchemaVersionTable.parentVersionId,
        projectId: projectSchemaVersionTable.projectId,
        schemaDefinition: projectSchemaVersionTable.schemaDefinition,
        version: projectSchemaVersionTable.version,
      })

    await transaction
      .update(projectTable)
      .set({ activeSchemaVersionId: createdSchemaVersion.id })
      .where(eq(projectTable.id, project.id))

    return createdSchemaVersion
  })
}
