import { z } from "zod"

export const pipelineDefinitionSchema = z.object({
  invalidationPolicy: z.enum(["manual", "replace_on_version_change"]),
  projectId: z.string().uuid(),
  stages: z.array(z.string().trim().min(1)),
  taskId: z.string().uuid(),
  version: z.string().trim().nullable(),
})
