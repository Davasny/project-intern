import { z } from "zod"

const internRunStateSchema = z.enum([
  "created",
  "booting",
  "booting_failed",
  "running",
  "running_failed",
  "persisting_outputs",
  "persisting_outputs_failed",
  "completed",
  "completed_failed",
  "failed",
  "failed_failed",
  "aborted",
  "aborted_failed",
  "skipped",
  "skipped_failed",
])

export type InternRunState = z.infer<typeof internRunStateSchema>

export const activeInternRunStates: readonly InternRunState[] = [
  "created",
  "booting",
  "running",
  "persisting_outputs",
] satisfies readonly InternRunState[]

export const isInternRunStateActive = (state: InternRunState): boolean =>
  activeInternRunStates.includes(state)
