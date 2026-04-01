import { eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { createTaskRecordValues } from "@/features/task-records/lib/create-task-record-values"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "insert" | "select">

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
    .where(eq(recordTable.projectId, projectId))

  const eligibleRecords =
    targetSchemaVersionId === null
      ? records
      : records.filter((record) => record.schemaVersion < schemaVersion)

  if (eligibleRecords.length === 0) {
    return []
  }

  return database
    .insert(taskRecordTable)
    .values(
      eligibleRecords.map((record) =>
        createTaskRecordValues({ recordId: record.id, taskId }),
      ),
    )
    .onConflictDoNothing({
      target: [taskRecordTable.taskId, taskRecordTable.recordId],
    })
    .returning({
      id: taskRecordTable.id,
    })
}
