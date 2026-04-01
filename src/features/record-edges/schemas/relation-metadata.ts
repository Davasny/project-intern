import { z } from "zod"

export const relationMetadataInputSchema = z.object({
  confidence: z.number().min(0).max(1).nullable(),
  notes: z.string().trim().max(2000),
  source: z.string().trim().max(200),
})

export type RelationMetadataInput = z.infer<typeof relationMetadataInputSchema>
