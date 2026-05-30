import { and, eq } from "drizzle-orm"
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
  task: {
    descriptionMarkdown: string
    id: string
    projectId: string
    temperature: number | null
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
      temperature: taskTable.temperature,
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
