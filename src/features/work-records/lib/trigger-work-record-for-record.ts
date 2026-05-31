import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { releaseClaimedWorkRecord } from "@/features/execution/lib/execution-claim-service"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { launchWorkRecordExecution } from "@/features/work-records/lib/launch-work-record-execution"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type TriggerWorkRecordForRecordParams = {
  projectId: string
  recordId: string
  workRecordId: string
}

export const triggerWorkRecordForRecord = async ({
  projectId,
  recordId,
  workRecordId,
}: TriggerWorkRecordForRecordParams) => {
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

  if (workRecord.state !== "waiting") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only waiting work records can be triggered.",
    })
  }

  const claimedWorkRecord = await launchWorkRecordExecution({
    projectId,
    workRecordId: workRecord.id,
  })

  if (!claimedWorkRecord) {
    logger.warn(
      { workRecordId, state: workRecord.state },
      "launchWorkRecordExecution returned null — see preceding launchWorkRecordExecution warnings for reason",
    )

    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Work record is not eligible for triggering. It may already be activated by another run.",
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
        requestedBy: "manual",
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
      message: "Task trigger could not enqueue execution.",
    })
  }

  executionLogger.info(
    {
      internRunId: claimedWorkRecord.internRunId,
      jobId,
      requestedBy: "manual",
      workRecordId: claimedWorkRecord.workRecordId,
    },
    "Enqueued claimed work record",
  )

  return {
    ...claimedWorkRecord,
    jobId,
  }
}
