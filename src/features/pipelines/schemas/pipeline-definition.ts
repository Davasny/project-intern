import { z } from "zod"

export const pipelineDefinitionSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  parserAssetVersion: z.string().trim().min(1),
  projectId: z.string().uuid(),
  stages: z.array(z.string().trim().min(1)),
  version: z.string().trim().min(1),
})

export type PipelineDefinition = z.infer<typeof pipelineDefinitionSchema>
