import { releaseClaimedWorkRecord } from "@/features/execution/lib/execution-claim-service"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { schedulerService } from "@/features/execution/lib/scheduler-service"
import { logger } from "@/lib/logger"

type RunTaskSchedulerTickParams = {
  limit: number
}

export const runTaskSchedulerTick = async ({
  limit,
}: RunTaskSchedulerTickParams) => {
  const enqueuedWorkRecordIds: string[] = []
  const schedulerLogger = logger.child({
    limit,
    service: "task-scheduler-tick",
  })

  for (let index = 0; index < limit; index += 1) {
    const scheduledWorkRecord = await schedulerService()

    if (!scheduledWorkRecord) {
      break
    }

    const jobId = await executionQueueService.enqueueWorkRecordExecution({
      internRunId: scheduledWorkRecord.internRunId,
      workRecordId: scheduledWorkRecord.workRecordId,
    })

    if (jobId === null) {
      schedulerLogger.warn(
        {
          internRunId: scheduledWorkRecord.internRunId,
          workRecordId: scheduledWorkRecord.workRecordId,
        },
        "Failed to enqueue claimed work record, releasing back to waiting",
      )

      try {
        await releaseClaimedWorkRecord({
          internRunId: scheduledWorkRecord.internRunId,
          reason: "ENQUEUE_FAILED",
          workRecordId: scheduledWorkRecord.workRecordId,
        })
      } catch (releaseError) {
        schedulerLogger.error(
          {
            error: releaseError,
            workRecordId: scheduledWorkRecord.workRecordId,
          },
          "Failed to release work record after enqueue failure",
        )
      }

      break
    }

    schedulerLogger.info(
      {
        internRunId: scheduledWorkRecord.internRunId,
        jobId,
        requestedBy: "scheduler",
        workRecordId: scheduledWorkRecord.workRecordId,
      },
      "Enqueued claimed work record",
    )

    enqueuedWorkRecordIds.push(scheduledWorkRecord.workRecordId)
  }

  schedulerLogger.info(
    {
      enqueuedCount: enqueuedWorkRecordIds.length,
      workRecordIds: enqueuedWorkRecordIds,
    },
    "Completed scheduler tick",
  )

  return {
    enqueuedCount: enqueuedWorkRecordIds.length,
    workRecordIds: enqueuedWorkRecordIds,
  }
}
