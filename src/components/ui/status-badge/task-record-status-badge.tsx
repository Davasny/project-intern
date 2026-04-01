import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

const taskRecordStatusMap: Record<
  TaskRecordState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  in_progress: { label: "In progress", tone: "info" },
  picked_up: { label: "Picked up", tone: "warning" },
  skipped: { label: "Skipped", tone: "muted" },
  waiting: { label: "Waiting", tone: "muted" },
}

type TaskRecordStatusBadgeProps = {
  state: TaskRecordState
}

export const TaskRecordStatusBadge = ({
  state,
}: TaskRecordStatusBadgeProps) => (
  <StatusBadge {...taskRecordStatusMap[state]} />
)
