import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { TaskSummaryState } from "@/features/tasks/schemas/task-summary-state"

const taskStatusMap: Record<
  TaskSummaryState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  cancelled: { label: "Cancelled", tone: "muted" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  in_progress: { label: "In progress", tone: "info" },
  not_started: { label: "Not started", tone: "muted" },
  partially_completed: { label: "Partial", tone: "warning" },
}

type TaskStatusBadgeProps = {
  state: TaskSummaryState
}

export const TaskStatusBadge = ({ state }: TaskStatusBadgeProps) => (
  <StatusBadge {...taskStatusMap[state]} />
)
