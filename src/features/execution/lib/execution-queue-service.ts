import { getPgBosser } from "@/features/execution/lib/get-pg-bosser"
import {
  type TaskExecutorQueuePayload,
  taskExecutorQueueName,
} from "@/features/execution/queues/task-executor-queue"

export const executionQueueService = {
  enqueueTaskRecordExecution: (payload: TaskExecutorQueuePayload) =>
    getPgBosser().send(taskExecutorQueueName, payload, {
      retryBackoff: true,
      retryDelay: 30,
      retryLimit: 5,
      singletonKey: payload.taskRecordId,
      singletonSeconds: 300,
    }),
}
