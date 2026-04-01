import { z } from "zod"

export const taskRetryScanQueueName = "task-record-retry-scan"

export const taskRetryScanQueuePayloadSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
})

export type TaskRetryScanQueuePayload = z.infer<
  typeof taskRetryScanQueuePayloadSchema
>
