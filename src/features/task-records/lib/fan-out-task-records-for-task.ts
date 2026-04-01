import { eq } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { createTaskRecordValues } from "@/features/task-records/lib/create-task-record-values"
import { db } from "@/lib/db"

type FanOutTaskRecordsForTaskParams = {
  projectId: string
  taskId: string
}

export const fanOutTaskRecordsForTask = async ({
  projectId,
  taskId,
}: FanOutTaskRecordsForTaskParams) => {
  const records = await db
    .select({ id: recordTable.id })
    .from(recordTable)
    .where(eq(recordTable.projectId, projectId))

  if (records.length === 0) {
    return []
  }

  return db
    .insert(taskRecordTable)
    .values(
      records.map((record) =>
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
