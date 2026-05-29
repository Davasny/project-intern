import { and, eq, inArray, isNull, lt } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { activeAgentRunStates } from "@/features/agent-runs/schemas/agent-run-state"
import {
  claimAndCreateRun,
  releaseClaimedTaskRecord,
} from "@/features/execution/lib/execution-claim-service"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { projectTable } from "@/features/projects/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type ReconcileExecutionsParams = {
  limit: number
  staleAfterMs?: number
}

export type ReconcileExecutionsResult = {
  recoveredCount: number
  skippedCount: number
  repairedTaskRecordIds: string[]
}

const enqueueRecoveredExecution = async ({
  agentRunId,
  repairAction,
  taskRecordId,
}: {
  agentRunId: string
  repairAction: string
  taskRecordId: string
}) => {
  const jobId = await executionQueueService.enqueueTaskRecordExecution({
    agentRunId,
    taskRecordId,
  })

  if (jobId === null) {
    executionLogger.error(
      { agentRunId, repairAction, taskRecordId },
      "Execution reconciler failed to enqueue recovered task record",
    )

    await releaseClaimedTaskRecord({
      agentRunId,
      reason: "RECONCILER_ENQUEUE_FAILED",
      taskRecordId,
    })

    return false
  }

  executionLogger.info(
    { agentRunId, jobId, repairAction, taskRecordId },
    "Execution reconciler enqueued recovered task record",
  )

  return true
}

export const reconcileExecutions = async ({
  limit,
  staleAfterMs = 10 * 60 * 1000,
}: ReconcileExecutionsParams): Promise<ReconcileExecutionsResult> => {
  const repairedTaskRecordIds: string[] = []
  let skippedCount = 0

  const orphanClaimFailures = await db
    .select({
      projectId: taskTable.projectId,
      state: taskRecordTable.state,
      taskRecordId: taskRecordTable.id,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskRecordTable.state, "picked_up_failed"),
        isNull(taskRecordTable.agentRunId),
      ),
    )
    .limit(limit)

  for (const taskRecord of orphanClaimFailures) {
    const claim = await claimAndCreateRun({
      projectId: taskRecord.projectId,
      requestedBy: "reconciler",
      taskRecordId: taskRecord.taskRecordId,
    })

    if (claim.status !== "claimed" && claim.status !== "already_claimed") {
      skippedCount += 1
      executionLogger.warn(
        {
          afterState: taskRecord.state,
          beforeState: taskRecord.state,
          repairAction: "claim_orphan_picked_up_failed",
          result: claim.status,
          taskRecordId: taskRecord.taskRecordId,
        },
        "Execution reconciler skipped orphan claim failure",
      )
      continue
    }

    const enqueued = await enqueueRecoveredExecution({
      agentRunId: claim.agentRunId,
      repairAction: "claim_orphan_picked_up_failed",
      taskRecordId: claim.taskRecordId,
    })

    if (enqueued) {
      repairedTaskRecordIds.push(claim.taskRecordId)
      executionLogger.info(
        {
          afterState: "picked_up",
          beforeState: taskRecord.state,
          repairAction: "claim_orphan_picked_up_failed",
          taskRecordId: claim.taskRecordId,
        },
        "Execution reconciler repaired orphan claim failure",
      )
    }
  }

  const remainingLimit = Math.max(0, limit - repairedTaskRecordIds.length)
  const staleThreshold = new Date(Date.now() - staleAfterMs)

  if (remainingLimit > 0) {
    const stalePickedUpRows = await db
      .select({
        agentRunId: taskRecordTable.agentRunId,
        state: taskRecordTable.state,
        taskRecordId: taskRecordTable.id,
      })
      .from(taskRecordTable)
      .where(
        and(
          eq(taskRecordTable.state, "picked_up"),
          lt(taskRecordTable.lastTransitionAt, staleThreshold),
        ),
      )
      .limit(remainingLimit)

    for (const taskRecord of stalePickedUpRows) {
      if (!taskRecord.agentRunId) {
        skippedCount += 1
        continue
      }

      const enqueued = await enqueueRecoveredExecution({
        agentRunId: taskRecord.agentRunId,
        repairAction: "reenqueue_stale_picked_up",
        taskRecordId: taskRecord.taskRecordId,
      })

      if (enqueued) {
        repairedTaskRecordIds.push(taskRecord.taskRecordId)
        executionLogger.info(
          {
            afterState: taskRecord.state,
            beforeState: taskRecord.state,
            repairAction: "reenqueue_stale_picked_up",
            taskRecordId: taskRecord.taskRecordId,
          },
          "Execution reconciler re-enqueued stale picked-up task record",
        )
      }
    }
  }

  const staleActiveRuns = await db
    .select({ agentRunId: agentRunTable.id, taskRecordId: taskRecordTable.id })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        inArray(agentRunTable.state, activeAgentRunStates),
        lt(agentRunTable.updatedAt, staleThreshold),
      ),
    )
    .limit(limit)

  if (staleActiveRuns.length > 0) {
    executionLogger.warn(
      {
        repairAction: "stale_active_agent_run_detected",
        staleCount: staleActiveRuns.length,
        agentRunIds: staleActiveRuns.map((run) => run.agentRunId),
      },
      "Execution reconciler found stale active agent runs; startup sweeper handles failure transition",
    )
  }

  return {
    recoveredCount: repairedTaskRecordIds.length,
    repairedTaskRecordIds,
    skippedCount,
  }
}
