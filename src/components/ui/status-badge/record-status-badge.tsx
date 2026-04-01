import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { RecordState } from "@/features/records/schemas/record-state"

const recordStatusMap: Record<
  RecordState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  active: { label: "Active", tone: "success" },
  archived: { label: "Archived", tone: "muted" },
  error: { label: "Error", tone: "danger" },
  processing: { label: "Processing", tone: "info" },
}

type RecordStatusBadgeProps = {
  state: RecordState
}

export const RecordStatusBadge = ({ state }: RecordStatusBadgeProps) => (
  <StatusBadge {...recordStatusMap[state]} />
)
