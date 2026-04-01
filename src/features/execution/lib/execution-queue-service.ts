import {
  type TaskExecutorQueuePayload,
  taskExecutorQueue,
} from "@/features/execution/queues/task-executor-queue"

export const executionQueueService = {
  enqueueTaskRecordExecution: (payload: TaskExecutorQueuePayload) =>
    taskExecutorQueue.send(payload, {
      retryBackoff: true,
      retryDelay: 30,
      retryLimit: 5,
      singletonKey: payload.taskRecordId,
      singletonSeconds: 300,
    }),
}
