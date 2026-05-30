import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { isFailedAgentRunState } from "@/features/execution/lib/is-failed-agent-run-state"

const runStatusMap: Record<
  AgentRunState,
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
  persisting_outputs_failed: {
    label: "Persisting outputs failed",
    tone: "danger",
  },
  running: { label: "Running", tone: "info" },
  running_failed: { label: "Run failed", tone: "danger" },
}

type ExecutionMatrixRunStatusBadgeProps = {
  attemptCount: number
  state: AgentRunState
}

export const ExecutionMatrixRunStatusBadge = ({
  attemptCount,
  state,
}: ExecutionMatrixRunStatusBadgeProps) => {
  const status = runStatusMap[state]
  const label =
    isFailedAgentRunState(state) && attemptCount > 1
      ? `${status.label} (${attemptCount.toLocaleString()})`
      : status.label

  return <StatusBadge label={label} tone={status.tone} />
}
