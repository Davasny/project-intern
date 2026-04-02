import { eq, sql } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { fanOutTaskRecordsForTask } from "@/features/task-records/lib/fan-out-task-records-for-task"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import type { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type DatabaseClient = Pick<
  typeof db,
  "execute" | "insert" | "select" | "update"
>

type CreateProjectTaskParams = {
  createdByUserId: string | null
  database: DatabaseClient
  descriptionMarkdown: string
  model: string | null
  organizationId: string
  projectId: string
  schemaVersion: number
  sourceSchemaVersionId: string | null
  targetSchemaVersionId: string | null
  title: string
}

export const createProjectTask = async ({
  createdByUserId,
  database,
  descriptionMarkdown,
  model,
  organizationId,
  projectId,
  schemaVersion,
  sourceSchemaVersionId,
  targetSchemaVersionId,
  title,
}: CreateProjectTaskParams) => {
  const nextSortOrder = await database
    .select({
      sortOrder: sql<number>`coalesce(max(${taskTable.sortOrder}), 0) + 1`,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))
    .then((rows) => rows[0]?.sortOrder ?? 1)

  const [task] = await database
    .insert(taskTable)
    .values({
      descriptionMarkdown,
      idempotencyKey: crypto.randomUUID(),
      model,
      projectId,
      schemaVersion,
      sortOrder: nextSortOrder,
      sourceSchemaVersionId,
      targetSchemaVersionId,
      title,
    })
    .returning({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      projectId: taskTable.projectId,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })

  await database.insert(taskDescriptionRevisionTable).values({
    createdByUserId,
    descriptionMarkdown: task.descriptionMarkdown,
    revisionNumber: 1,
    taskId: task.id,
  })

  await fanOutTaskRecordsForTask({
    database,
    projectId,
    schemaVersion: task.schemaVersion,
    targetSchemaVersionId: task.targetSchemaVersionId,
    taskId: task.id,
  })

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
    projectId,
    recordId: null,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: task.id,
    taskRecordId: null,
  })

  logger.info({ projectId, taskId: task.id }, "Created project task")

  return task
}
