import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { schedulerService } from "@/features/execution/lib/scheduler-service"

type RunTaskSchedulerTickParams = {
  limit: number
}

export const runTaskSchedulerTick = async ({
  limit,
}: RunTaskSchedulerTickParams) => {
  const enqueuedTaskRecordIds: string[] = []

  for (let index = 0; index < limit; index += 1) {
    const scheduledTaskRecord = await schedulerService()

    if (!scheduledTaskRecord) {
      break
    }

    const jobId = await executionQueueService.enqueueTaskRecordExecution({
      taskRecordId: scheduledTaskRecord.taskRecordId,
    })

    if (jobId === null) {
      break
    }

    enqueuedTaskRecordIds.push(scheduledTaskRecord.taskRecordId)
  }

  return {
    enqueuedCount: enqueuedTaskRecordIds.length,
    taskRecordIds: enqueuedTaskRecordIds,
  }
}
