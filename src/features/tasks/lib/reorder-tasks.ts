import { TRPCError } from "@trpc/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskTable } from "@/features/tasks/db"
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

  await db.transaction(async (tx) => {
    await tx
      .update(taskTable)
      .set({
        sortOrder: sql`${taskTable.sortOrder} + ${input.orderedTaskIds.length + 10}`,
      })
      .where(
        and(
          eq(taskTable.projectId, project.id),
          inArray(taskTable.id, input.orderedTaskIds),
        ),
      )

    for (const [index, taskId] of input.orderedTaskIds.entries()) {
      await tx
        .update(taskTable)
        .set({ sortOrder: index + 1 })
        .where(
          and(eq(taskTable.id, taskId), eq(taskTable.projectId, project.id)),
        )
    }
  })

  await createActivityLogEvent({
    actorId: userId,
    actorType: "user",
    agentRunId: null,
    entityId: null,
    entityType: "taskList",
    eventType: "task.reordered",
    organizationId: project.organizationId,
    payload: {
      orderedTaskIds: input.orderedTaskIds,
    },
    projectId: project.id,
    recordId: null,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: null,
    taskRecordId: null,
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
