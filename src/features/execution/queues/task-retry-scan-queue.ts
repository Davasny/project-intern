import { Queue } from "pg-bosser"
import { z } from "zod"
import { pgBosserOptions } from "@/features/execution/lib/pg-bosser-options"

const taskRetryScanQueueName = "task-record-retry-scan"

const taskRetryScanQueuePayloadSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
})

type TaskRetryScanQueuePayload = z.infer<typeof taskRetryScanQueuePayloadSchema>

export const taskRetryScanQueue = new Queue<TaskRetryScanQueuePayload>({
  name: taskRetryScanQueueName,
  pgBossOptions: pgBosserOptions,
})
