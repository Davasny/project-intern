import { and, eq, inArray } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { createTaskRecordMachineRow } from "@/features/task-records/lib/create-task-record-machine-row"
import type { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type DatabaseClient = Pick<
  typeof db,
  "execute" | "insert" | "select" | "update"
>

type FanOutTaskRecordsForTaskParams = {
  database: DatabaseClient
  projectId: string
  schemaVersion: number
  taskId: string
  targetSchemaVersionId: string | null
}

export const fanOutTaskRecordsForTask = async ({
  database,
  projectId,
  schemaVersion,
  taskId,
  targetSchemaVersionId,
}: FanOutTaskRecordsForTaskParams) => {
  const records = await database
    .select({ id: recordTable.id, schemaVersion: recordTable.schemaVersion })
    .from(recordTable)
    .where(
      and(eq(recordTable.projectId, projectId), eq(recordTable.state, "active")),
    )

  const eligibleRecords =
    targetSchemaVersionId === null
      ? records
      : records.filter((record) => record.schemaVersion < schemaVersion)

  if (eligibleRecords.length === 0) {
    return []
  }

  const existingTaskRecords = await database
    .select({ recordId: taskRecordTable.recordId })
    .from(taskRecordTable)
    .where(
      and(
        eq(taskRecordTable.taskId, taskId),
        inArray(
          taskRecordTable.recordId,
          eligibleRecords.map((record) => record.id),
        ),
      ),
    )

  const existingRecordIds = new Set(
    existingTaskRecords.map((taskRecord) => taskRecord.recordId),
  )
  const missingRecords = eligibleRecords.filter(
    (record) => !existingRecordIds.has(record.id),
  )

  const ids = await generateUuidV7Values({
    count: missingRecords.length,
    database,
  })

  const createdTaskRecords = await Promise.all(
    missingRecords.map((record, index) =>
      createTaskRecordMachineRow({
        id: ids[index],
        recordId: record.id,
        taskId,
      }),
    ),
  )

  return createdTaskRecords.flatMap((taskRecord) =>
    taskRecord ? [{ id: taskRecord.id }] : [],
  )
}
