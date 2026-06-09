import { Worker } from "pg-bosser"
import { executorService } from "@/features/execution/lib/executor-service"
import { handleTaskExecutorWorkerError } from "@/features/execution/lib/handle-task-executor-worker-error"
import {
  taskExecutorQueue,
  taskExecutorQueuePayloadSchema,
} from "@/features/execution/queues/task-executor-queue"
import { logger } from "@/lib/logger"

type CreateTaskExecutorWorkerParams = {
  lifecycle: {
    onJobFinished: () => void
    onJobStarted: () => void
  }
  workerName: string
}

export const createTaskExecutorWorker = ({
  lifecycle,
  workerName,
}: CreateTaskExecutorWorkerParams) =>
  new Worker(taskExecutorQueue, async (job) => {
    const payload = taskExecutorQueuePayloadSchema.parse(job.data)
    const childLogger = logger.child({
      worker: workerName,
      queue: taskExecutorQueue.queueName,
      jobId: job.id,
      jobName: job.name,
      internRunId: payload.internRunId,
      workRecordId: payload.workRecordId,
    })

    childLogger.info("processing task executor job")
    lifecycle.onJobStarted()

    try {
      try {
        const executionResult = await executorService({
          internRunId: payload.internRunId,
          workRecordId: payload.workRecordId,
        })

        childLogger.info(
          { sessionId: executionResult.sessionId },
          "completed task executor job",
        )
      } catch (error) {
        childLogger.error(
          {
            error,
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          },
          "task executor job failed during executor service",
        )

        try {
          await handleTaskExecutorWorkerError({ error, job })
        } catch (mappingError) {
          childLogger.error(
            { error: mappingError },
            "Failed to map executor error to work record failure, re-throwing for pg-bosser retry",
          )
          throw error
        }
      }
    } finally {
      lifecycle.onJobFinished()
    }
  })
