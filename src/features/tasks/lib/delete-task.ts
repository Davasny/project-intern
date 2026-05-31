import { TRPCError } from "@trpc/server"
import { and, eq, isNotNull } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const alwaysDeletableStates = new Set([
  "created",
  "accepting_failed",
  "rejecting_failed",
  "rejected",
])

type DeleteTaskParams = {
  organizationSlug: string
  projectSlug: string
  taskId: string
  userId: string
}

export const deleteTask = async ({
  organizationSlug,
  projectSlug,
  taskId,
  userId,
}: DeleteTaskParams) => {
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

  const task = await db
    .select({
      id: taskTable.id,
      state: taskTable.state,
      title: taskTable.title,
    })
    .from(taskTable)
    .where(and(eq(taskTable.id, taskId), eq(taskTable.projectId, project.id)))
    .then((rows) => rows[0] ?? null)

  if (!task) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task not found.",
    })
  }

  if (task.state === "accepting" || task.state === "rejecting") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a task while it is being processed.",
    })
  }

  if (task.state === "accepted") {
    const runsExist = await db
      .select({ id: workRecordTable.id })
      .from(workRecordTable)
      .where(
        and(
          eq(workRecordTable.taskId, task.id),
          isNotNull(workRecordTable.internRunId),
        ),
      )
      .then((rows) => rows.length > 0)

    if (runsExist) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Cannot delete a task that has been executed. Remove its intern runs first.",
      })
    }
  }

  if (!alwaysDeletableStates.has(task.state) && task.state !== "accepted") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Tasks in "${task.state}" state cannot be deleted.`,
    })
  }

  try {
    await db.delete(taskTable).where(eq(taskTable.id, task.id))
  } catch (error) {
    logger.error(
      { error, projectId: project.id, taskId },
      "Failed to delete task",
    )
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete the task.",
    })
  }

  logger.info(
    { projectId: project.id, taskId, taskTitle: task.title },
    "Task deleted",
  )

  return { id: task.id }
}
