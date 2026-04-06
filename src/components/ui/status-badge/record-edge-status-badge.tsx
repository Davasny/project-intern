import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { RecordEdgeState } from "@/features/record-edges/lib/record-edge-machine";

const recordEdgeStatusMap: Record<
  RecordEdgeState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  active: { label: "Active", tone: "success" },
  activating: { label: "Activating", tone: "info" },
  created: { label: "Created", tone: "info" },
  create_failed: { label: "Create failed", tone: "danger" },
  deactivate_failed: { label: "Deactivate failed", tone: "danger" },
  deactivating: { label: "Deactivating", tone: "info" },
  edit_failed: { label: "Edit failed", tone: "danger" },
  editing: { label: "Editing", tone: "info" },
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
