import { and, eq, inArray } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { createWorkRecordMachineRow } from "@/features/work-records/lib/create-work-record-machine-row"
import { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type BackfillWorkRecordsForRecordParams = {
  projectId: string
  recordId: string
}

export const backfillWorkRecordsForRecord = async ({
  projectId,
  recordId,
}: BackfillWorkRecordsForRecordParams) => {
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

  const existingWorkRecords = await db
    .select({ taskId: workRecordTable.taskId })
    .from(workRecordTable)
    .where(
      and(
        eq(workRecordTable.recordId, recordId),
        inArray(
          workRecordTable.taskId,
          applicableTasks.map((task) => task.id),
        ),
      ),
    )

  const existingTaskIds = new Set(
    existingWorkRecords.map((workRecord) => workRecord.taskId),
  )
  const missingTasks = applicableTasks.filter(
    (task) => !existingTaskIds.has(task.id),
  )

  const ids = await generateUuidV7Values({
    count: missingTasks.length,
    database: db,
  })

  const createdWorkRecords = await Promise.all(
    missingTasks.map((task, index) =>
      createWorkRecordMachineRow({
        id: ids[index],
        recordId,
        taskId: task.id,
      }),
    ),
  )

  return createdWorkRecords.flatMap((workRecord) =>
    workRecord ? [{ id: workRecord.id }] : [],
  )
}
