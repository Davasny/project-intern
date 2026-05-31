import { TRPCError } from "@trpc/server"
import { and, eq, gte, inArray } from "drizzle-orm"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"
import { terminalWorkRecordStates } from "@/features/work-records/schemas/work-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ResetDownstreamWorkRecordsParams = {
  projectId: string
  taskId: string
}

export const resetDownstreamWorkRecords = async ({
  projectId,
  taskId,
}: ResetDownstreamWorkRecordsParams) => {
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
      id: workRecordTable.id,
      taskId: workRecordTable.taskId,
    })
    .from(workRecordTable)
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskTable.projectId, projectId),
        gte(taskTable.sortOrder, targetTask.sortOrder),
        inArray(workRecordTable.state, terminalWorkRecordStates),
      ),
    )

  if (downstreamRecords.length === 0) {
    logger.info(
      { taskId, projectId },
      "No terminal downstream work records to reset",
    )
    return { affectedTaskIds: [], resetCount: 0 }
  }

  let resetCount = 0
  const affectedTaskIds = new Set<string>()

  const resetTimestamp = new Date()

  for (const record of downstreamRecords) {
    try {
      const actor = await getWorkRecordActor(record.id)
      if (actor.nextEvents.includes("reset")) {
        await actor.send("reset", { lastTransitionAt: resetTimestamp })
        resetCount++
        affectedTaskIds.add(record.taskId)
      }
    } catch (error) {
      logger.warn(
        { error, workRecordId: record.id },
        "Failed to reset downstream work record",
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
    "Reset downstream work records",
  )

  return {
    affectedTaskIds: [...affectedTaskIds],
    resetCount,
  }
}
