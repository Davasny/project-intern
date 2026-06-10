import { z } from "zod"

const workRecordStateSchema = z.enum([
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

export type WorkRecordState = z.infer<typeof workRecordStateSchema>

/** States in which the work record has been claimed and is actively executing or about to execute. */
export const activeWorkRecordStates = [
  "picked_up",
  "in_progress",
] satisfies Array<WorkRecordState>

/** Non-terminal error states that can be retried back to their parent state. */
export const retryableWorkRecordStates = [
  "failed",
  "skipped",
  "picked_up_failed",
  "completed_failed",
  "failed_failed",
] satisfies Array<WorkRecordState>

/** Retryable states that are safe for automatic cron retry. User-facing failed/skipped states stay manual-only. */
export const autoRetryableWorkRecordStates = [
  "picked_up_failed",
  "completed_failed",
] satisfies Array<WorkRecordState>

export const autoPickableWorkRecordStates = [
  "waiting",
  "picked_up_failed",
] satisfies Array<WorkRecordState>

/** States eligible for a manual claim (trigger or retry-and-claim). */
export const claimableWorkRecordStates = [
  "waiting",
  "skipped",
  "picked_up_failed",
] satisfies Array<WorkRecordState>

/** Terminal states — the work record is done and won't block later tasks. */
export const terminalWorkRecordStates = [
  "completed",
  "skipped",
] satisfies Array<WorkRecordState>

const terminalWorkRecordStateSet: ReadonlySet<WorkRecordState> = new Set(
  terminalWorkRecordStates,
)

export const isTerminalWorkRecordState = (state: WorkRecordState): boolean =>
  terminalWorkRecordStateSet.has(state)

export const isRetryableWorkRecordState = (state: WorkRecordState): boolean =>
  new Set<WorkRecordState>(retryableWorkRecordStates).has(state)
