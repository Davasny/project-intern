import { z } from "zod"

export const pipelineRunEntrySchema = z.object({
  agentRunId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  id: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()),
  pipelineDefinitionId: z.string().uuid().nullable(),
  pipelineVersion: z.string().trim().min(1),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  stage: z.string().trim().min(1),
  state: z.enum(["registered", "running", "completed", "failed"]),
  taskId: z.string().uuid(),
  taskRecordId: z.string().uuid(),
  updatedAt: z.coerce.date(),
})

export type PipelineRunEntry = z.infer<typeof pipelineRunEntrySchema>
