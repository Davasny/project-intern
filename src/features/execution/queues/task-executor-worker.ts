import { Worker } from "pg-bosser"
import { executorService } from "@/features/execution/lib/executor-service"
import { handleTaskExecutorWorkerError } from "@/features/execution/lib/handle-task-executor-worker-error"
import {
  taskExecutorQueue,
  taskExecutorQueuePayloadSchema,
} from "@/features/execution/queues/task-executor-queue"
import { logger } from "@/lib/logger"

export const taskExecutorWorker = new Worker(taskExecutorQueue, async (job) => {
  const payload = taskExecutorQueuePayloadSchema.parse(job.data)
  const childLogger = logger.child({
    worker: "taskExecutorWorker",
    queue: taskExecutorQueue.queueName,
    jobId: job.id,
    jobName: job.name,
    internRunId: payload.internRunId,
    workRecordId: payload.workRecordId,
  })

  childLogger.info("processing task executor job")

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
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
      "task executor job failed during executor service",
    )

    // Map the error to an intern run failure so the work record state machine
    // transitions properly. Do NOT re-throw — pg-bosser retries at the queue
    // level would conflict with state machine transitions. Instead the retry
    // scan worker will pick up failed work records and retry them via the
    // state machine.
    try {
      await handleTaskExecutorWorkerError({ error, job })
    } catch (mappingError) {
      childLogger.error(
        { error: mappingError },
        "Failed to map executor error to work record failure, re-throwing for pg-bosser retry",
      )
      // Re-throw only when even the error mapping fails (infrastructure error)
      throw error
    }
  }
})
