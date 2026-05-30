import type { StatusBadgeTone } from "@/components/ui/status-badge/status-badge"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"
import { agentRunHistoryEventKindTone } from "@/features/agent-runs/lib/agent-run-history-event-kind-tone"

export const getAgentRunHistoryEventTone = (
  event: AgentRunHistoryEvent,
): StatusBadgeTone =>
  event.kind === "tool" && event.title === "skill"
    ? "skill"
    : agentRunHistoryEventKindTone[event.kind]
