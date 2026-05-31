import { Queue } from "pg-bosser"
import { z } from "zod"
import { pgBosserOptions } from "@/features/execution/lib/pg-bosser-options"

const taskExecutorQueueName = "work-record-execution"

export const taskExecutorQueuePayloadSchema = z.object({
  internRunId: z.string().uuid(),
  workRecordId: z.string().uuid(),
})

export type TaskExecutorQueuePayload = z.infer<
  typeof taskExecutorQueuePayloadSchema
>

export const taskExecutorQueue = new Queue<TaskExecutorQueuePayload>({
  name: taskExecutorQueueName,
  pgBossOptions: pgBosserOptions,
})
