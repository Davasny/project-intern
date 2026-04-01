import { z } from "zod"

export const pipelineRunEntrySchema = z.object({
  agentRunId: z.string().uuid(),
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  stage: z.string().trim().min(1),
  status: z.enum(["completed", "failed", "running"]),
  taskId: z.string().uuid(),
  taskRecordId: z.string().uuid(),
})

export const pipelineRunManifestSchema = z.object({
  runs: z.array(pipelineRunEntrySchema),
})
