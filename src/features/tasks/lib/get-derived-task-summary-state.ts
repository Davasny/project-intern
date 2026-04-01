import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import type { TaskSummaryState } from "@/features/tasks/schemas/task-summary-state"

type TaskSummaryParams = {
  states: Array<TaskRecordState>
}

export const getDerivedTaskSummaryState = ({
  states,
}: TaskSummaryParams): TaskSummaryState => {
  if (states.length === 0) {
    return "not_started"
  }

  const completedCount = states.filter((state) => state === "completed").length
  const failedCount = states.filter((state) => state === "failed").length
  const skippedCount = states.filter((state) => state === "skipped").length
  const activeCount = states.filter(
    (state) => state === "picked_up" || state === "in_progress",
  ).length

  if (completedCount === states.length) {
    return "completed"
  }

  if (skippedCount === states.length) {
    return "cancelled"
  }

  if (activeCount > 0) {
    return "in_progress"
  }

  if (completedCount > 0 || skippedCount > 0) {
    return "partially_completed"
  }

  if (failedCount > 0) {
    return "failed"
  }

  return "not_started"
}
