import { and, eq, sql } from "drizzle-orm"
import { activityLogTable } from "@/features/observability/db"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type FinalizeProjectSchemaMigrationParams = {
  taskId: string
}

export const finalizeProjectSchemaMigration = async ({
  taskId,
}: FinalizeProjectSchemaMigrationParams) => {
  const task = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      schemaVersion: taskTable.schemaVersion,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
    })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .then((rows) => rows[0] ?? null)

  if (!task?.targetSchemaVersionId) {
    return null
  }

  const taskRecords = await db
    .select({ state: taskRecordTable.state })
    .from(taskRecordTable)
    .where(eq(taskRecordTable.taskId, task.id))

  if (
    taskRecords.some(
      (taskRecord) =>
        taskRecord.state !== "completed" && taskRecord.state !== "skipped",
    )
  ) {
    return null
  }

  const outdatedRecord = await db
    .select({ id: recordTable.id })
    .from(recordTable)
    .where(
      and(
        eq(recordTable.projectId, task.projectId),
        sql`${recordTable.schemaVersion} < ${task.schemaVersion}`,
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (outdatedRecord) {
    return null
  }

  const existingFinalizationEvent = await db
    .select({ id: activityLogTable.id })
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.eventType, "schema.migration_finalized"),
        eq(activityLogTable.taskId, task.id),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (existingFinalizationEvent) {
    return existingFinalizationEvent
  }

  const project = await db
    .select({ organizationId: projectTable.organizationId })
    .from(projectTable)
    .where(eq(projectTable.id, task.projectId))
    .then((rows) => rows[0] ?? null)

  if (!project) {
    return null
  }

  await createActivityLogEvent({
    actorId: null,
    actorType: "system",
    agentRunId: null,
    database: db,
    entityId: task.targetSchemaVersionId,
    entityType: "projectSchemaVersion",
    eventType: "schema.migration_finalized",
    organizationId: project.organizationId,
    payload: {
      schemaVersion: task.schemaVersion,
      taskId: task.id,
      title: task.title,
    },
    projectId: task.projectId,
    recordId: null,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: task.id,
    taskRecordId: null,
  })

  return { schemaVersion: task.schemaVersion, taskId: task.id }
}
