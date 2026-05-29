import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"

export type AgentRunHistoryTimelineEvent = AgentRunHistoryEvent & {
  kind: Exclude<AgentRunHistoryEvent["kind"], "metadata">
}

export const isAgentRunHistoryTimelineEvent = (
  event: AgentRunHistoryEvent,
): event is AgentRunHistoryTimelineEvent => event.kind !== "metadata"
