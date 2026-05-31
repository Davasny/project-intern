import { inArray } from "drizzle-orm"
import { workRecordTable } from "@/features/work-records/db"
import { workRecordMachine } from "@/features/work-records/lib/work-record-machine"
import { retryableWorkRecordStates } from "@/features/work-records/schemas/work-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type RunTaskRetryScanParams = {
  limit: number
}

export const runTaskRetryScan = async ({ limit }: RunTaskRetryScanParams) => {
  const retriedWorkRecordIds: string[] = []
  const retryLogger = logger.child({
    limit,
    service: "task-retry-scan",
  })

  const workRecords = await db
    .select({
      id: workRecordTable.id,
      state: workRecordTable.state,
    })
    .from(workRecordTable)
    .where(inArray(workRecordTable.state, retryableWorkRecordStates))
    .limit(limit)

  if (workRecords.length === 0) {
    retryLogger.info("no failed or skipped work records to retry")
    return {
      retriedCount: 0,
      workRecordIds: [],
    }
  }

  retryLogger.info(
    { count: workRecords.length },
    "found failed or skipped work records to retry",
  )

  for (const workRecord of workRecords) {
    const childLogger = retryLogger.child({
      workRecordId: workRecord.id,
      currentState: workRecord.state,
    })

    const actor = await workRecordMachine.getActor(workRecord.id)

    if (!actor) {
      childLogger.warn("could not load work record actor")
      continue
    }

    if (!actor.nextEvents.includes("retry")) {
      childLogger.warn(
        { nextEvents: actor.nextEvents },
        "retry event not available, skipping",
      )
      continue
    }

    try {
      await actor.send("retry", {
        lastTransitionAt: new Date(),
      })
      retriedWorkRecordIds.push(workRecord.id)
      childLogger.info("successfully retried work record")
    } catch (error) {
      childLogger.error({ error }, "failed to retry work record")
    }
  }

  retryLogger.info(
    {
      retriedCount: retriedWorkRecordIds.length,
      workRecordIds: retriedWorkRecordIds,
    },
    "completed task retry scan",
  )

  return {
    retriedCount: retriedWorkRecordIds.length,
    workRecordIds: retriedWorkRecordIds,
  }
}
