import { TRPCError } from "@trpc/server"
import { and, eq, gte, inArray } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { terminalTaskRecordStates } from "@/features/task-records/schemas/task-record-state"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ResetDownstreamTaskRecordsParams = {
  projectId: string
  taskId: string
}

export const resetDownstreamTaskRecords = async ({
  projectId,
  taskId,
}: ResetDownstreamTaskRecordsParams) => {
  const targetTask = await db
    .select({ sortOrder: taskTable.sortOrder, title: taskTable.title })
    .from(taskTable)
    .where(and(eq(taskTable.id, taskId), eq(taskTable.projectId, projectId)))
    .then((rows) => rows[0] ?? null)

  if (!targetTask) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task not found.",
    })
  }

  const downstreamRecords = await db
    .select({
      id: taskRecordTable.id,
      taskId: taskRecordTable.taskId,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskTable.projectId, projectId),
        gte(taskTable.sortOrder, targetTask.sortOrder),
        inArray(taskRecordTable.state, terminalTaskRecordStates),
      ),
    )

  if (downstreamRecords.length === 0) {
    logger.info(
      { taskId, projectId },
      "No terminal downstream task-records to reset",
    )
    return { affectedTaskIds: [], resetCount: 0 }
  }

  let resetCount = 0
  const affectedTaskIds = new Set<string>()

  const resetTimestamp = new Date()

  for (const record of downstreamRecords) {
    try {
      const actor = await getTaskRecordActor(record.id)
      if (actor.nextEvents.includes("reset")) {
        await actor.send("reset", { lastTransitionAt: resetTimestamp })
        resetCount++
        affectedTaskIds.add(record.taskId)

      }
    } catch (error) {
      logger.warn(
        { error, taskRecordId: record.id },
        "Failed to reset downstream task-record",
      )
    }
  }

  logger.info(
    {
      affectedTaskIds: [...affectedTaskIds],
      projectId,
      resetCount,
      taskId,
    },
    "Reset downstream task-records",
  )

  return {
    affectedTaskIds: [...affectedTaskIds],
    resetCount,
  }
}
