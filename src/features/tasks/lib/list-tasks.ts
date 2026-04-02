import { TRPCError } from "@trpc/server"
import { asc, eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { getDerivedTaskSummaryState } from "@/features/tasks/lib/get-derived-task-summary-state"
import { db } from "@/lib/db"

type ListTasksParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listTasks = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListTasksParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const tasks = await db
    .select({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, project.id))
    .orderBy(asc(taskTable.sortOrder))

  const taskRecordStates = await db
    .select({
      state: taskRecordTable.state,
      taskId: taskRecordTable.taskId,
    })
    .from(taskRecordTable)

  return tasks.map((task) => {
    const states = taskRecordStates
      .filter((taskRecord) => taskRecord.taskId === task.id)
      .map((taskRecord) => taskRecord.state)

    return {
      ...task,
      progress: {
        completedCount: states.filter((state) => state === "completed").length,
        failedCount: states.filter((state) => state === "failed").length,
        inProgressCount: states.filter(
          (state) => state === "picked_up" || state === "in_progress",
        ).length,
        skippedCount: states.filter((state) => state === "skipped").length,
        totalCount: states.length,
        waitingCount: states.filter((state) => state === "waiting").length,
      },
      summaryState: getDerivedTaskSummaryState({ states }),
    }
  })
}
