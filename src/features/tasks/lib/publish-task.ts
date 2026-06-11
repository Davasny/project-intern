import { and, eq } from "drizzle-orm"
import {
  taskDefinitionVersionTable,
  taskDescriptionRevisionTable,
  taskTable,
} from "@/features/tasks/db"
import { createTaskDefinitionVersion } from "@/features/tasks/lib/create-task-definition-version"
import { fanOutWorkRecordsForTask } from "@/features/work-records/lib/fan-out-work-records-for-task"
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
    model: string | null
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

  const firstDefinitionVersion = await database
    .select({ id: taskDefinitionVersionTable.id })
    .from(taskDefinitionVersionTable)
    .where(
      and(
        eq(taskDefinitionVersionTable.taskId, task.id),
        eq(taskDefinitionVersionTable.versionNumber, 1),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!firstDefinitionVersion) {
    await createTaskDefinitionVersion({
      createdByUserId,
      database,
      task: {
        descriptionMarkdown: task.descriptionMarkdown,
        id: task.id,
        model: task.model,
        schemaVersion: task.schemaVersion,
        sourceSchemaVersionId: task.sourceSchemaVersionId,
        targetSchemaVersionId: task.targetSchemaVersionId,
        temperature: task.temperature,
        title: task.title,
      },
    })
  }

  await fanOutWorkRecordsForTask({
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
