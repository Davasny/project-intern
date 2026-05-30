import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskTable } from "@/features/tasks/db"
import { applyTaskOrder } from "@/features/tasks/lib/apply-task-order"
import type { TaskReorderInput } from "@/features/tasks/schemas/task-input"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ReorderTasksParams = {
  input: TaskReorderInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const reorderTasks = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: ReorderTasksParams) => {
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
    .select({ id: taskTable.id })
    .from(taskTable)
    .where(eq(taskTable.projectId, project.id))

  if (tasks.length !== input.orderedTaskIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task reorder payload does not match the project task set.",
    })
  }

  const taskIds = tasks.map((task) => task.id).sort()
  const orderedTaskIds = [...input.orderedTaskIds].sort()

  if (taskIds.join(":") !== orderedTaskIds.join(":")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task reorder payload does not match the project task set.",
    })
  }

  await applyTaskOrder({
    database: db,
    orderedTaskIds: input.orderedTaskIds,
    projectId: project.id,
  })

  logger.info(
    { orderedTaskIds: input.orderedTaskIds, projectId: project.id, userId },
    "Reordered tasks",
  )

  return db
    .select({
      id: taskTable.id,
      sortOrder: taskTable.sortOrder,
      title: taskTable.title,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, project.id))
}
