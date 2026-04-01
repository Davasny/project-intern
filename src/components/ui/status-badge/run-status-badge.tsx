import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"

const runStatusMap: Record<
  AgentRunState,
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  aborted: { label: "Aborted", tone: "muted" },
  booting: { label: "Booting", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  created: { label: "Created", tone: "muted" },
  failed: { label: "Failed", tone: "danger" },
  persisting_outputs: { label: "Persisting outputs", tone: "warning" },
  running: { label: "Running", tone: "info" },
}

type RunStatusBadgeProps = {
  state: AgentRunState
}

export const RunStatusBadge = ({ state }: RunStatusBadgeProps) => (
  <StatusBadge {...runStatusMap[state]} />
)
