import { and, eq, inArray } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { workRecordTable } from "@/features/work-records/db"
import { createWorkRecordMachineRow } from "@/features/work-records/lib/create-work-record-machine-row"
import type { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type DatabaseClient = Pick<
  typeof db,
  "execute" | "insert" | "select" | "update"
>

type FanOutWorkRecordsForTaskParams = {
  database: DatabaseClient
  projectId: string
  schemaVersion: number
  taskId: string
  targetSchemaVersionId: string | null
}

export const fanOutWorkRecordsForTask = async ({
  database,
  projectId,
  schemaVersion,
  taskId,
  targetSchemaVersionId,
}: FanOutWorkRecordsForTaskParams) => {
  const records = await database
    .select({ id: recordTable.id, schemaVersion: recordTable.schemaVersion })
    .from(recordTable)
    .where(
      and(
        eq(recordTable.projectId, projectId),
        eq(recordTable.state, "active"),
      ),
    )

  const eligibleRecords =
    targetSchemaVersionId === null
      ? records
      : records.filter((record) => record.schemaVersion < schemaVersion)

  if (eligibleRecords.length === 0) {
    return []
  }

  const existingWorkRecords = await database
    .select({ recordId: workRecordTable.recordId })
    .from(workRecordTable)
    .where(
      and(
        eq(workRecordTable.taskId, taskId),
        inArray(
          workRecordTable.recordId,
          eligibleRecords.map((record) => record.id),
        ),
      ),
    )

  const existingRecordIds = new Set(
    existingWorkRecords.map((workRecord) => workRecord.recordId),
  )
  const missingRecords = eligibleRecords.filter(
    (record) => !existingRecordIds.has(record.id),
  )

  const ids = await generateUuidV7Values({
    count: missingRecords.length,
    database,
  })

  const createdWorkRecords = await Promise.all(
    missingRecords.map((record, index) =>
      createWorkRecordMachineRow({
        id: ids[index],
        recordId: record.id,
        taskId,
      }),
    ),
  )

  return createdWorkRecords.flatMap((workRecord) =>
    workRecord ? [{ id: workRecord.id }] : [],
  )
}
