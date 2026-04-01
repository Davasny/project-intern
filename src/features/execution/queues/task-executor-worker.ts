import { Worker } from "pg-bosser"
import { executorService } from "@/features/execution/lib/executor-service"
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
    agentRunId: payload.agentRunId,
    taskRecordId: payload.taskRecordId,
  })

  childLogger.info("processing task executor job")

  await executorService({
    agentRunId: payload.agentRunId,
    taskRecordId: payload.taskRecordId,
  })

  childLogger.info("completed task executor job")
})
