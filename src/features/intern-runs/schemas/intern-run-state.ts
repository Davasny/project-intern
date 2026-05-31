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
])

export type InternRunState = z.infer<typeof internRunStateSchema>

export const activeInternRunStates = [
  "created",
  "booting",
  "running",
  "persisting_outputs",
] as const

export const isInternRunStateActive = (state: InternRunState): boolean =>
  activeInternRunStates.includes(
    state as (typeof activeInternRunStates)[number],
  )
