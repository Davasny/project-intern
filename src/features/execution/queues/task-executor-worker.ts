import { executorService } from "@/features/execution/lib/executor-service"
import { getPgBosser } from "@/features/execution/lib/get-pg-bosser"
import {
  type TaskExecutorQueuePayload,
  taskExecutorQueueName,
  taskExecutorQueuePayloadSchema,
} from "@/features/execution/queues/task-executor-queue"

export const taskExecutorWorker = async () => {
  const boss = getPgBosser()

  await boss.work<TaskExecutorQueuePayload>(
    taskExecutorQueueName,
    async (jobs) => {
      const job = jobs[0]

      if (!job) {
        return
      }

      const payload = taskExecutorQueuePayloadSchema.parse(job.data)

      await executorService({
        agentRunId: payload.agentRunId,
        taskRecordId: payload.taskRecordId,
      })
    },
  )
}
