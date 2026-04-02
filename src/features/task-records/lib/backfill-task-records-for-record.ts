import { and, eq, inArray } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { createTaskRecordMachineRow } from "@/features/task-records/lib/create-task-record-machine-row"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type BackfillTaskRecordsForRecordParams = {
  projectId: string
  recordId: string
}

export const backfillTaskRecordsForRecord = async ({
  projectId,
  recordId,
}: BackfillTaskRecordsForRecordParams) => {
  const record = await db
    .select({ schemaVersion: recordTable.schemaVersion })
    .from(recordTable)
    .where(eq(recordTable.id, recordId))
    .then((rows) => rows[0] ?? null)

  if (!record) {
    return []
  }

  const tasks = await db
    .select({
      id: taskTable.id,
      schemaVersion: taskTable.schemaVersion,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))

  const applicableTasks = tasks.filter(
    (task) =>
      task.targetSchemaVersionId === null ||
      record.schemaVersion < task.schemaVersion,
  )

  if (applicableTasks.length === 0) {
    return []
  }

  const existingTaskRecords = await db
    .select({ taskId: taskRecordTable.taskId })
    .from(taskRecordTable)
    .where(
      and(
        eq(taskRecordTable.recordId, recordId),
        inArray(
          taskRecordTable.taskId,
          applicableTasks.map((task) => task.id),
        ),
      ),
    )

  const existingTaskIds = new Set(
    existingTaskRecords.map((taskRecord) => taskRecord.taskId),
  )
  const missingTasks = applicableTasks.filter(
    (task) => !existingTaskIds.has(task.id),
  )

  const ids = await generateUuidV7Values({
    count: missingTasks.length,
    database: db,
  })

  const createdTaskRecords = await Promise.all(
    missingTasks.map((task, index) =>
      createTaskRecordMachineRow({
        database: db,
        id: ids[index],
        recordId,
        taskId: task.id,
      }),
    ),
  )

  return createdTaskRecords.flatMap((taskRecord) =>
    taskRecord ? [{ id: taskRecord.id }] : [],
  )
}
