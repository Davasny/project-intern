import { z } from "zod"

export const taskFailureSchema = z.object({
  code: z.string().trim().min(1),
  message: z.string().trim().min(1),
  missingInputs: z.array(z.string().trim().min(1)).optional(),
  retryable: z.boolean(),
})

export type TaskFailure = z.infer<typeof taskFailureSchema>
