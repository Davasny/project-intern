import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"

type GetAgentRunHistoryVisibleEventsInput = {
  events: Array<AgentRunHistoryEvent>
  hideMetadata: boolean
}

export const getAgentRunHistoryVisibleEvents = ({
  events,
  hideMetadata,
}: GetAgentRunHistoryVisibleEventsInput) =>
  hideMetadata ? events.filter((event) => event.kind !== "metadata") : events
