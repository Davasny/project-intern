import { TRPCError } from "@trpc/server"
import { and, eq, gte, inArray } from "drizzle-orm"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"
import { terminalWorkRecordStates } from "@/features/work-records/schemas/work-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ResetDownstreamWorkRecordsForRecordParams = {
  projectId: string
  recordId: string
  workRecordId: string
}

export const resetDownstreamWorkRecordsForRecord = async ({
  projectId,
  recordId,
  workRecordId,
}: ResetDownstreamWorkRecordsForRecordParams) => {
  const targetWorkRecord = await db
    .select({
      sortOrder: taskTable.sortOrder,
      taskId: taskTable.id,
      title: taskTable.title,
    })
    .from(workRecordTable)
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(workRecordTable.id, workRecordId),
        eq(workRecordTable.recordId, recordId),
        eq(taskTable.projectId, projectId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!targetWorkRecord) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Work record was not found.",
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
        eq(workRecordTable.recordId, recordId),
        eq(taskTable.projectId, projectId),
        gte(taskTable.sortOrder, targetWorkRecord.sortOrder),
        inArray(workRecordTable.state, terminalWorkRecordStates),
      ),
    )

  if (downstreamRecords.length === 0) {
    logger.info(
      { projectId, recordId, workRecordId },
      "No terminal downstream work records to reset for record",
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
        "Failed to reset downstream work record for record",
      )
    }
  }

  logger.info(
    {
      affectedTaskIds: [...affectedTaskIds],
      projectId,
      recordId,
      resetCount,
      workRecordId,
    },
    "Reset downstream work records for record",
  )

  return {
    affectedTaskIds: [...affectedTaskIds],
    resetCount,
  }
}
