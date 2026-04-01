import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { buildSchemaMigrationTaskDescription } from "@/features/project-schema/lib/build-schema-migration-task-description"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { createProjectTask } from "@/features/tasks/lib/create-project-task"
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
        schemaDefinition: projectSchemaVersionTable.schemaDefinition,
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

    const migrationTask = latestSchemaVersion
      ? await createProjectTask({
          createdByUserId: userId,
          database: transaction,
          descriptionMarkdown: buildSchemaMigrationTaskDescription({
            nextSchemaDefinition: createdSchemaVersion.schemaDefinition,
            nextVersion: createdSchemaVersion.version,
            previousSchemaDefinition: latestSchemaVersion.schemaDefinition,
            previousVersion: latestSchemaVersion.version,
          }),
          model: null,
          organizationId: project.organizationId,
          pipelineVersion: null,
          projectId: project.id,
          schemaVersion: createdSchemaVersion.version,
          sourceSchemaVersionId: latestSchemaVersion.id,
          targetSchemaVersionId: createdSchemaVersion.id,
          title: `Adopt schema v${createdSchemaVersion.version}`,
        })
      : null

    await createActivityLogEvent({
      actorId: userId,
      actorType: "user",
      agentRunId: null,
      database: transaction,
      entityId: createdSchemaVersion.id,
      entityType: "projectSchemaVersion",
      eventType: "schema.version_created",
      organizationId: project.organizationId,
      payload: {
        migrationTaskId: migrationTask?.id ?? null,
        version: createdSchemaVersion.version,
      },
      projectId: project.id,
      recordId: null,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: migrationTask?.id ?? null,
      taskRecordId: null,
    })

    return {
      ...createdSchemaVersion,
      migrationTaskId: migrationTask?.id ?? null,
    }
  })
}
