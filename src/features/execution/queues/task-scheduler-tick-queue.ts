import { Queue } from "pg-bosser"
import { z } from "zod"
import { pgBosserOptions } from "@/features/execution/lib/pg-bosser-options"

export const taskSchedulerTickQueueName = "task-record-scheduler-tick"

export const taskSchedulerTickQueuePayloadSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
})

export type TaskSchedulerTickQueuePayload = z.infer<
  typeof taskSchedulerTickQueuePayloadSchema
>

export const taskSchedulerTickQueue = new Queue<TaskSchedulerTickQueuePayload>({
  name: taskSchedulerTickQueueName,
  pgBossOptions: pgBosserOptions,
})
