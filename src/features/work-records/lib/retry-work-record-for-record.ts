import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { releaseClaimedWorkRecord } from "@/features/execution/lib/execution-claim-service"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"
import { launchWorkRecordExecution } from "@/features/work-records/lib/launch-work-record-execution"
import { retryableWorkRecordStates } from "@/features/work-records/schemas/work-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type RetryWorkRecordForRecordParams = {
  projectId: string
  recordId: string
  workRecordId: string
}

export const retryWorkRecordForRecord = async ({
  projectId,
  recordId,
  workRecordId,
}: RetryWorkRecordForRecordParams) => {
  const workRecord = await db
    .select({
      id: workRecordTable.id,
      state: workRecordTable.state,
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

  if (!workRecord) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Work record was not found.",
    })
  }

  if (
    !retryableWorkRecordStates.includes(
      workRecord.state as (typeof retryableWorkRecordStates)[number],
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only retryable work records can be retried.",
    })
  }

  const actor = await getWorkRecordActor(workRecord.id)

  if (actor.nextEvents.includes("retry")) {
    await actor.send("retry", { lastTransitionAt: new Date() })
  }

  const claimedWorkRecord = await launchWorkRecordExecution({
    projectId,
    requestedBy: "retry",
    workRecordId: workRecord.id,
  })

  if (!claimedWorkRecord) {
    logger.warn(
      { workRecordId, state: workRecord.state },
      "launchWorkRecordExecution returned null — see preceding launchWorkRecordExecution warnings for reason",
    )

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Work record could not be scheduled for retry.",
    })
  }

  const jobId = await executionQueueService.enqueueWorkRecordExecution({
    internRunId: claimedWorkRecord.internRunId,
    workRecordId: claimedWorkRecord.workRecordId,
  })

  if (jobId === null) {
    executionLogger.error(
      {
        internRunId: claimedWorkRecord.internRunId,
        workRecordId: claimedWorkRecord.workRecordId,
        requestedBy: "retry",
      },
      "Failed to enqueue claimed work record",
    )

    await releaseClaimedWorkRecord({
      internRunId: claimedWorkRecord.internRunId,
      reason: "ENQUEUE_FAILED",
      workRecordId: claimedWorkRecord.workRecordId,
    })

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task retry could not enqueue execution.",
    })
  }

  executionLogger.info(
    {
      internRunId: claimedWorkRecord.internRunId,
      jobId,
      requestedBy: "retry",
      workRecordId: claimedWorkRecord.workRecordId,
    },
    "Enqueued claimed work record",
  )

  return {
    ...claimedWorkRecord,
    jobId,
  }
}
