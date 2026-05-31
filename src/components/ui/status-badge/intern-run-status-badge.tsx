import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"

const runStatusMap: Record<
  InternRunState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  aborted: { label: "Aborted", tone: "muted" },
  aborted_failed: { label: "Abort failed", tone: "danger" },
  booting: { label: "Booting", tone: "info" },
  booting_failed: { label: "Boot failed", tone: "danger" },
  completed: { label: "Completed", tone: "success" },
  completed_failed: { label: "Completion failed", tone: "danger" },
  created: { label: "Created", tone: "muted" },
  failed: { label: "Failed", tone: "danger" },
  failed_failed: { label: "Failure failed", tone: "danger" },
  persisting_outputs: { label: "Persisting outputs", tone: "warning" },
  persisting_outputs_failed: { label: "Persisting outputs failed", tone: "danger" },
  running: { label: "Running", tone: "info" },
  running_failed: { label: "Run failed", tone: "danger" },
}

type RunStatusBadgeProps = {
  state: InternRunState
}

export const RunStatusBadge = ({ state }: RunStatusBadgeProps) => (
  <StatusBadge {...runStatusMap[state]} />
)
