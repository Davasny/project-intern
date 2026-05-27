import { inArray } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { taskRecordMachine } from "@/features/task-records/lib/task-record-machine"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type RunTaskRetryScanParams = {
  limit: number
}

export const runTaskRetryScan = async ({
  limit,
}: RunTaskRetryScanParams) => {
  const retriedTaskRecordIds: string[] = []
  const retryLogger = logger.child({
    limit,
    service: "task-retry-scan",
  })

  const taskRecords = await db
    .select({
      id: taskRecordTable.id,
      state: taskRecordTable.state,
    })
    .from(taskRecordTable)
    .where(inArray(taskRecordTable.state, ["failed", "skipped"]))
    .limit(limit)

  if (taskRecords.length === 0) {
    retryLogger.info("no failed or skipped task records to retry")
    return {
      retriedCount: 0,
      taskRecordIds: [],
    }
  }

  retryLogger.info(
    { count: taskRecords.length },
    "found failed or skipped task records to retry",
  )

  for (const taskRecord of taskRecords) {
    const childLogger = retryLogger.child({
      taskRecordId: taskRecord.id,
      currentState: taskRecord.state,
    })

    const actor = await taskRecordMachine.getActor(taskRecord.id)

    if (!actor) {
      childLogger.warn("could not load task record actor")
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
      retriedTaskRecordIds.push(taskRecord.id)
      childLogger.info("successfully retried task record")
    } catch (error) {
      childLogger.error({ error }, "failed to retry task record")
    }
  }

  retryLogger.info(
    {
      retriedCount: retriedTaskRecordIds.length,
      taskRecordIds: retriedTaskRecordIds,
    },
    "completed task retry scan",
  )

  return {
    retriedCount: retriedTaskRecordIds.length,
    taskRecordIds: retriedTaskRecordIds,
  }
}
