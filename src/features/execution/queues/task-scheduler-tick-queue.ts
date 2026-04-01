import { z } from "zod"

export const taskSchedulerTickQueueName = "task-record-scheduler-tick"

export const taskSchedulerTickQueuePayloadSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
})

export type TaskSchedulerTickQueuePayload = z.infer<
  typeof taskSchedulerTickQueuePayloadSchema
>
