import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

export const getTaskRecordActivityScope = async (taskRecordId: string) => {
  const activityScope = await db
    .select({
      organizationId: projectTable.organizationId,
      projectId: projectTable.id,
      recordId: recordTable.id,
      recordName: recordTable.name,
      taskId: taskTable.id,
      taskRecordId: taskRecordTable.id,
      taskTitle: taskTable.title,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskRecordTable.id, taskRecordId))
    .then((rows) => rows[0] ?? null)

  if (!activityScope) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task record activity scope was not found.",
    })
  }

  return activityScope
}
