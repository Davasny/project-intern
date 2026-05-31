import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"

export const isFailedInternRunState = (state: InternRunState) =>
  state === "booting_failed" ||
  state === "running_failed" ||
  state === "persisting_outputs_failed" ||
  state === "completed_failed" ||
  state === "failed" ||
  state === "failed_failed" ||
  state === "aborted_failed"
