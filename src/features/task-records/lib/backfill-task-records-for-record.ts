import { eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { createTaskRecordValues } from "@/features/task-records/lib/create-task-record-values"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

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

  return db
    .insert(taskRecordTable)
    .values(
      applicableTasks.map((task) =>
        createTaskRecordValues({ recordId, taskId: task.id }),
      ),
    )
    .onConflictDoNothing({
      target: [taskRecordTable.taskId, taskRecordTable.recordId],
    })
    .returning({
      id: taskRecordTable.id,
    })
}
