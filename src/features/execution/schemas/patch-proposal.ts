import { z } from "zod"

const setPatchChangeSchema = z.object({
  field: z.string().trim().min(1),
  op: z.literal("set"),
  reason: z.string().trim().min(1),
  sources: z.array(z.string().trim().min(1)).min(1),
  value: z.unknown(),
})

const unsetPatchChangeSchema = z.object({
  field: z.string().trim().min(1),
  op: z.literal("unset"),
  reason: z.string().trim().min(1),
  sources: z.array(z.string().trim().min(1)).min(1),
})

export const patchProposalSchema = z.object({
  baseVersion: z.number().int().positive(),
  changes: z.array(z.union([setPatchChangeSchema, unsetPatchChangeSchema])),
  recordId: z.string().uuid(),
})

export type PatchProposal = z.infer<typeof patchProposalSchema>
