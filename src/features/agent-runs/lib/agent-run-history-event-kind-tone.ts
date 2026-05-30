import type { StatusBadgeTone } from "@/components/ui/status-badge/status-badge"
import type { AgentRunHistoryEventKind } from "@/features/agent-runs/lib/agent-run-history-event"

export const agentRunHistoryEventKindTone = {
  agent: "success",
  error: "danger",
  file: "muted",
  metadata: "muted",
  reasoning: "warning",
  system: "info",
  tool: "info",
} satisfies Record<AgentRunHistoryEventKind, StatusBadgeTone>
