import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"

const workRecordStatusMap: Record<
  WorkRecordState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  completed: { label: "Completed", tone: "success" },
  completed_failed: { label: "Completion failed", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  failed_failed: { label: "Failure failed", tone: "danger" },
  in_progress: { label: "In progress", tone: "info" },
  picked_up: { label: "Picked up", tone: "warning" },
  picked_up_failed: { label: "Claim failed", tone: "danger" },
  skipped: { label: "Skipped", tone: "success" },
  waiting: { label: "Waiting", tone: "muted" },
}

type WorkRecordStatusBadgeProps = {
  state: WorkRecordState
}

export const WorkRecordStatusBadge = ({
  state,
}: WorkRecordStatusBadgeProps) => (
  <StatusBadge {...workRecordStatusMap[state]} />
)
