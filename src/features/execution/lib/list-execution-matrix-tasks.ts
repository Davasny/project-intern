import { asc, eq } from "drizzle-orm"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type ListExecutionMatrixTasksParams = {
  projectId: string
}

export const listExecutionMatrixTasks = async ({
  projectId,
}: ListExecutionMatrixTasksParams) =>
  db
    .select({
      id: taskTable.id,
      sortOrder: taskTable.sortOrder,
      title: taskTable.title,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))
    .orderBy(asc(taskTable.sortOrder), asc(taskTable.title), asc(taskTable.id))
