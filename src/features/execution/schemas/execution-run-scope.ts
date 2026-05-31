import { z } from "zod"

const executionRunScopeSchema = z.object({
  internRunId: z.string().uuid(),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  taskId: z.string().uuid(),
  workRecordId: z.string().uuid(),
})

export type ExecutionRunScope = z.infer<typeof executionRunScopeSchema>
