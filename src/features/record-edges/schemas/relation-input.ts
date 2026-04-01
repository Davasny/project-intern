import { z } from "zod"
import { relationTypeValues } from "@/features/record-edges/lib/relation-type-rules"
import { recordEdgeDirectionSchema } from "@/features/record-edges/schemas/record-edge-direction"
import { relationMetadataInputSchema } from "@/features/record-edges/schemas/relation-metadata"

const relationTargetInputSchema = z.object({
  direction: recordEdgeDirectionSchema,
  metadata: relationMetadataInputSchema,
  relationType: z.enum(relationTypeValues),
  targetProjectSlug: z.string().trim().min(1),
  targetRecordId: z.string().uuid(),
})

export const relationCreateInputSchema = relationTargetInputSchema.extend({
  recordId: z.string().uuid(),
})

export const relationUpdateInputSchema = relationTargetInputSchema.extend({
  recordEdgeId: z.string().uuid(),
  recordId: z.string().uuid(),
})

export const relationDeactivateInputSchema = z.object({
  recordEdgeId: z.string().uuid(),
  recordId: z.string().uuid(),
})

export type RelationCreateInput = z.infer<typeof relationCreateInputSchema>
export type RelationUpdateInput = z.infer<typeof relationUpdateInputSchema>
export type RelationDeactivateInput = z.infer<
  typeof relationDeactivateInputSchema
>
