import { z } from "zod"

export const taskExecutorQueueName = "task-record-execution"

export const taskExecutorQueuePayloadSchema = z.object({
  taskRecordId: z.string().uuid(),
})

export type TaskExecutorQueuePayload = z.infer<
  typeof taskExecutorQueuePayloadSchema
>
