import { z } from "zod"

export const recordInputSchema = z.object({
  context: z.record(z.string(), z.unknown()),
  name: z.string().trim().min(1, "Record name is required."),
})

export const recordUpdateInputSchema = recordInputSchema.extend({
  recordId: z.string().uuid(),
  version: z.number().int().positive(),
})

export type RecordInput = z.infer<typeof recordInputSchema>
export type RecordUpdateInput = z.infer<typeof recordUpdateInputSchema>
