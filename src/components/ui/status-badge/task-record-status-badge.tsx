import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

const taskRecordStatusMap: Record<
  TaskRecordState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  completed: { label: "Completed", tone: "success" },
  completed_failed: { label: "Completion failed", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  failed_failed: { label: "Failure failed", tone: "danger" },
  in_progress: { label: "In progress", tone: "info" },
  picked_up: { label: "Picked up", tone: "warning" },
  picked_up_failed: { label: "Claim failed", tone: "danger" },
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
