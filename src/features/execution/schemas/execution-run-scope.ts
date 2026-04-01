import { z } from "zod"

export const executionRunScopeSchema = z.object({
  agentRunId: z.string().uuid(),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  taskId: z.string().uuid(),
  taskRecordId: z.string().uuid(),
})

export type ExecutionRunScope = z.infer<typeof executionRunScopeSchema>
