import { and, eq } from "drizzle-orm"
import { activityLogTable } from "@/features/observability/db"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { fanOutTaskRecordsForTask } from "@/features/task-records/lib/fan-out-task-records-for-task"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import type { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type DatabaseClient = Pick<
  typeof db,
  "execute" | "insert" | "select" | "update"
>

type PublishTaskParams = {
  createdByUserId: string | null
  database: DatabaseClient
  organizationId: string
  task: {
    descriptionMarkdown: string
    id: string
    projectId: string
    schemaVersion: number
    sortOrder: number
    sourceSchemaVersionId: string | null
    targetSchemaVersionId: string | null
    title: string
  }
}

export const publishTask = async ({
  createdByUserId,
  database,
  organizationId,
  task,
}: PublishTaskParams) => {
  const firstRevision = await database
    .select({ id: taskDescriptionRevisionTable.id })
    .from(taskDescriptionRevisionTable)
    .where(
      and(
        eq(taskDescriptionRevisionTable.taskId, task.id),
        eq(taskDescriptionRevisionTable.revisionNumber, 1),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!firstRevision) {
    await database.insert(taskDescriptionRevisionTable).values({
      createdByUserId,
      descriptionMarkdown: task.descriptionMarkdown,
      revisionNumber: 1,
      taskId: task.id,
    })
  }

  await fanOutTaskRecordsForTask({
    database,
    projectId: task.projectId,
    schemaVersion: task.schemaVersion,
    targetSchemaVersionId: task.targetSchemaVersionId,
    taskId: task.id,
  })

  const createdEvent = await database
    .select({ id: activityLogTable.id })
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.projectId, task.projectId),
        eq(activityLogTable.taskId, task.id),
        eq(activityLogTable.eventType, "task.created"),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!createdEvent) {
    await createActivityLogEvent({
      actorId: createdByUserId,
      actorType: createdByUserId === null ? "system" : "user",
      agentRunId: null,
      database,
      entityId: task.id,
      entityType: "task",
      eventType: "task.created",
      organizationId,
      payload: {
        schemaVersion: task.schemaVersion,
        sortOrder: task.sortOrder,
        sourceSchemaVersionId: task.sourceSchemaVersionId,
        targetSchemaVersionId: task.targetSchemaVersionId,
        title: task.title,
      },
      projectId: task.projectId,
      recordId: null,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: task.id,
      taskRecordId: null,
    })
  }

  logger.info({ projectId: task.projectId, taskId: task.id }, "Published task")

  return database
    .update(taskTable)
    .set({ state: "accepted" })
    .where(eq(taskTable.id, task.id))
    .returning({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      state: taskTable.state,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .then((rows) => rows[0] ?? null)
}
