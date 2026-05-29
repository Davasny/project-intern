import { z } from "zod"

const taskRecordStateSchema = z.enum([
  "waiting",
  "picked_up",
  "picked_up_failed",
  "in_progress",
  "completed",
  "completed_failed",
  "failed",
  "failed_failed",
  "skipped",
])

export type TaskRecordState = z.infer<typeof taskRecordStateSchema>

/** States in which the task record has been claimed and is actively executing or about to execute. */
export const activeTaskRecordStates = [
  "picked_up",
  "in_progress",
] satisfies Array<TaskRecordState>

/** Non-terminal error states that can be retried back to their parent state. */
export const retryableTaskRecordStates = [
  "failed",
  "skipped",
  "picked_up_failed",
  "completed_failed",
  "failed_failed",
] satisfies Array<TaskRecordState>

/** States eligible for a manual claim (trigger or retry-and-claim). */
export const claimableTaskRecordStates = [
  "waiting",
  "skipped",
  "picked_up_failed",
] satisfies Array<TaskRecordState>

/** Terminal states — the task record is done and won't block later tasks. */
export const terminalTaskRecordStates = [
  "completed",
  "skipped",
] satisfies Array<TaskRecordState>
