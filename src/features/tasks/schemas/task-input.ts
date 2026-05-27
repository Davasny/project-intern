import { z } from "zod"
import { runtimeTemperatureSchema } from "@/features/execution/schemas/runtime-temperature"

const nullableStringSchema = z.string().trim().min(1).nullable()

export const taskInputSchema = z.object({
  descriptionMarkdown: z
    .string()
    .trim()
    .min(1, "Task description is required."),
  model: nullableStringSchema,
  temperature: runtimeTemperatureSchema.nullable(),
  schemaVersion: z.number().int().min(1),
  title: z.string().trim().min(1, "Task title is required."),
})

export const taskCreateIntentSchema = z.enum([
  "create_draft",
  "create_draft_and_accept",
])

export const taskUpdateInputSchema = taskInputSchema.extend({
  taskId: z.string().uuid(),
})

export const taskReorderInputSchema = z.object({
  orderedTaskIds: z.array(z.string().uuid()).min(1),
})

export type TaskInput = z.infer<typeof taskInputSchema>
export type TaskCreateIntent = z.infer<typeof taskCreateIntentSchema>
export type TaskUpdateInput = z.infer<typeof taskUpdateInputSchema>
export type TaskReorderInput = z.infer<typeof taskReorderInputSchema>
