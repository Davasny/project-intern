import { Queue } from "pg-bosser"
import { z } from "zod"
import { pgBosserOptions } from "@/features/execution/lib/pg-bosser-options"

export const taskExecutorQueueName = "task-record-execution"

export const taskExecutorQueuePayloadSchema = z.object({
  agentRunId: z.string().uuid(),
  taskRecordId: z.string().uuid(),
})

export type TaskExecutorQueuePayload = z.infer<
  typeof taskExecutorQueuePayloadSchema
>

export const taskExecutorQueue = new Queue<TaskExecutorQueuePayload>({
  name: taskExecutorQueueName,
  pgBossOptions: pgBosserOptions,
})
