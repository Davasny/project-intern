import { eq } from "drizzle-orm"
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
  const tasks = await db
    .select({ id: taskTable.id })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))

  if (tasks.length === 0) {
    return []
  }

  return db
    .insert(taskRecordTable)
    .values(
      tasks.map((task) =>
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
