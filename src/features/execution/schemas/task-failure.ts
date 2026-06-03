import { z } from "zod"

export const taskFailureSchema = z
  .object({
    code: z.string().trim().min(1),
    missingInputs: z.array(z.string().trim().min(1)).optional(),
    reason: z.string().trim().min(1),
    retryable: z.boolean(),
  })
  .catchall(z.unknown())

export type TaskFailure = z.infer<typeof taskFailureSchema>
