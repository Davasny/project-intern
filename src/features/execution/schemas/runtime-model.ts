import { z } from "zod"

export const runtimeModelSchema = z
  .string()
  .trim()
  .min(1)
  .regex(
    /^[^/\s]+\/[^/\s]+$/,
    "Runtime model must use provider/model-id format.",
  )

export type RuntimeModel = z.infer<typeof runtimeModelSchema>
