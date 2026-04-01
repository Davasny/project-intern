import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { schedulerService } from "@/features/execution/lib/scheduler-service"
import { logger } from "@/lib/logger"

type RunTaskSchedulerTickParams = {
  limit: number
}

export const runTaskSchedulerTick = async ({
  limit,
}: RunTaskSchedulerTickParams) => {
  const enqueuedTaskRecordIds: string[] = []
  const schedulerLogger = logger.child({
    limit,
    service: "task-scheduler-tick",
  })

  for (let index = 0; index < limit; index += 1) {
    const scheduledTaskRecord = await schedulerService()

    if (!scheduledTaskRecord) {
      break
    }

    const jobId = await executionQueueService.enqueueTaskRecordExecution({
      agentRunId: scheduledTaskRecord.agentRunId,
      taskRecordId: scheduledTaskRecord.taskRecordId,
    })

    if (jobId === null) {
      schedulerLogger.warn(
        {
          agentRunId: scheduledTaskRecord.agentRunId,
          taskRecordId: scheduledTaskRecord.taskRecordId,
        },
        "Failed to enqueue claimed task record",
      )
      break
    }

    enqueuedTaskRecordIds.push(scheduledTaskRecord.taskRecordId)
  }

  schedulerLogger.info(
    {
      enqueuedCount: enqueuedTaskRecordIds.length,
      taskRecordIds: enqueuedTaskRecordIds,
    },
    "Completed scheduler tick",
  )

  return {
    enqueuedCount: enqueuedTaskRecordIds.length,
    taskRecordIds: enqueuedTaskRecordIds,
  }
}
