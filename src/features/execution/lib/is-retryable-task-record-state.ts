import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

export const isRetryableTaskRecordState = (state: TaskRecordState) =>
  state === "failed" ||
  state === "picked_up_failed" ||
  state === "completed_failed" ||
  state === "failed_failed"
