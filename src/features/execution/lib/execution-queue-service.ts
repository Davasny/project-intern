import {
  type TaskExecutorQueuePayload,
  taskExecutorQueue,
} from "@/features/execution/queues/task-executor-queue"

export const executionQueueService = {
  enqueueWorkRecordExecution: (payload: TaskExecutorQueuePayload) =>
    taskExecutorQueue.send(payload, {
      retryBackoff: true,
      retryDelay: 30,
      retryLimit: 5,
      singletonKey: `${payload.workRecordId}:${payload.internRunId}`,
      singletonSeconds: 300,
    }),
}
