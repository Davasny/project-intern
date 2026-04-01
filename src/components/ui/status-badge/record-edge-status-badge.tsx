import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { RecordEdgeState } from "@/features/record-edges/schemas/record-edge-state"

const recordEdgeStatusMap: Record<
  RecordEdgeState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "muted" },
}

type RecordEdgeStatusBadgeProps = {
  state: RecordEdgeState
}

export const RecordEdgeStatusBadge = ({
  state,
}: RecordEdgeStatusBadgeProps) => (
  <StatusBadge {...recordEdgeStatusMap[state]} />
)
