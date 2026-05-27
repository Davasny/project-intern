import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { schedulerService } from "@/features/execution/lib/scheduler-service"
import { taskRecordMachine } from "@/features/task-records/lib/task-record-machine"
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
        "Failed to enqueue claimed task record, releasing back to waiting",
      )

      // Release the task record back to waiting so it can be picked up
      // again on the next scheduler tick
      try {
        const actor = await taskRecordMachine.getActor(
          scheduledTaskRecord.taskRecordId,
        )
        if (actor && actor.nextEvents.includes("release")) {
          await actor.send("release", { lastTransitionAt: new Date() })
        }
      } catch (releaseError) {
        schedulerLogger.error(
          { error: releaseError, taskRecordId: scheduledTaskRecord.taskRecordId },
          "Failed to release task record after enqueue failure",
        )
      }

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
