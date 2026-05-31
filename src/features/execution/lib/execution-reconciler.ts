import { and, eq, inArray, isNull, lt } from "drizzle-orm"
import {
  claimAndCreateRun,
  releaseClaimedWorkRecord,
} from "@/features/execution/lib/execution-claim-service"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { internRunTable } from "@/features/intern-runs/db"
import { activeInternRunStates } from "@/features/intern-runs/schemas/intern-run-state"
import { projectTable } from "@/features/projects/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type ReconcileExecutionsParams = {
  limit: number
  staleAfterMs?: number
}

export type ReconcileExecutionsResult = {
  recoveredCount: number
  skippedCount: number
  repairedWorkRecordIds: string[]
}

const enqueueRecoveredExecution = async ({
  internRunId,
  repairAction,
  workRecordId,
}: {
  internRunId: string
  repairAction: string
  workRecordId: string
}) => {
  const jobId = await executionQueueService.enqueueWorkRecordExecution({
    internRunId,
    workRecordId,
  })

  if (jobId === null) {
    executionLogger.error(
      { internRunId, repairAction, workRecordId },
      "Execution reconciler failed to enqueue recovered work record",
    )

    await releaseClaimedWorkRecord({
      internRunId,
      reason: "RECONCILER_ENQUEUE_FAILED",
      workRecordId,
    })

    return false
  }

  executionLogger.info(
    { internRunId, jobId, repairAction, workRecordId },
    "Execution reconciler enqueued recovered work record",
  )

  return true
}

export const reconcileExecutions = async ({
  limit,
  staleAfterMs = 10 * 60 * 1000,
}: ReconcileExecutionsParams): Promise<ReconcileExecutionsResult> => {
  const repairedWorkRecordIds: string[] = []
  let skippedCount = 0

  const orphanClaimFailures = await db
    .select({
      projectId: taskTable.projectId,
      state: workRecordTable.state,
      workRecordId: workRecordTable.id,
    })
    .from(workRecordTable)
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(workRecordTable.state, "picked_up_failed"),
        isNull(workRecordTable.internRunId),
      ),
    )
    .limit(limit)

  for (const workRecord of orphanClaimFailures) {
    const claim = await claimAndCreateRun({
      projectId: workRecord.projectId,
      requestedBy: "reconciler",
      workRecordId: workRecord.workRecordId,
    })

    if (claim.status !== "claimed" && claim.status !== "already_claimed") {
      skippedCount += 1
      executionLogger.warn(
        {
          afterState: workRecord.state,
          beforeState: workRecord.state,
          repairAction: "claim_orphan_picked_up_failed",
          result: claim.status,
          workRecordId: workRecord.workRecordId,
        },
        "Execution reconciler skipped orphan claim failure",
      )
      continue
    }

    const enqueued = await enqueueRecoveredExecution({
      internRunId: claim.internRunId,
      repairAction: "claim_orphan_picked_up_failed",
      workRecordId: claim.workRecordId,
    })

    if (enqueued) {
      repairedWorkRecordIds.push(claim.workRecordId)
      executionLogger.info(
        {
          afterState: "picked_up",
          beforeState: workRecord.state,
          repairAction: "claim_orphan_picked_up_failed",
          workRecordId: claim.workRecordId,
        },
        "Execution reconciler repaired orphan claim failure",
      )
    }
  }

  const remainingLimit = Math.max(0, limit - repairedWorkRecordIds.length)
  const staleThreshold = new Date(Date.now() - staleAfterMs)

  if (remainingLimit > 0) {
    const stalePickedUpRows = await db
      .select({
        internRunId: workRecordTable.internRunId,
        state: workRecordTable.state,
        workRecordId: workRecordTable.id,
      })
      .from(workRecordTable)
      .where(
        and(
          eq(workRecordTable.state, "picked_up"),
          lt(workRecordTable.lastTransitionAt, staleThreshold),
        ),
      )
      .limit(remainingLimit)

    for (const workRecord of stalePickedUpRows) {
      if (!workRecord.internRunId) {
        skippedCount += 1
        continue
      }

      const enqueued = await enqueueRecoveredExecution({
        internRunId: workRecord.internRunId,
        repairAction: "reenqueue_stale_picked_up",
        workRecordId: workRecord.workRecordId,
      })

      if (enqueued) {
        repairedWorkRecordIds.push(workRecord.workRecordId)
        executionLogger.info(
          {
            afterState: workRecord.state,
            beforeState: workRecord.state,
            repairAction: "reenqueue_stale_picked_up",
            workRecordId: workRecord.workRecordId,
          },
          "Execution reconciler re-enqueued stale picked-up work record",
        )
      }
    }
  }

  const staleActiveRuns = await db
    .select({
      internRunId: internRunTable.id,
      workRecordId: workRecordTable.id,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        inArray(internRunTable.state, activeInternRunStates),
        lt(internRunTable.updatedAt, staleThreshold),
      ),
    )
    .limit(limit)

  if (staleActiveRuns.length > 0) {
    executionLogger.warn(
      {
        repairAction: "stale_active_intern_run_detected",
        staleCount: staleActiveRuns.length,
        internRunIds: staleActiveRuns.map((run) => run.internRunId),
      },
      "Execution reconciler found stale active intern runs; startup sweeper handles failure transition",
    )
  }

  return {
    recoveredCount: repairedWorkRecordIds.length,
    repairedWorkRecordIds,
    skippedCount,
  }
}
