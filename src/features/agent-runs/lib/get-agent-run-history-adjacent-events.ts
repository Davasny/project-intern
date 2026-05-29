import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"

type GetAgentRunHistoryAdjacentEventsInput = {
  events: Array<AgentRunHistoryEvent>
  selectedEventId: string | null
}

export const getAgentRunHistoryAdjacentEvents = ({
  events,
  selectedEventId,
}: GetAgentRunHistoryAdjacentEventsInput) => {
  const selectedEventIndex = events.findIndex(
    (event) => event.id === selectedEventId,
  )

  if (selectedEventIndex === -1) {
    return {
      previousEvent: null,
      nextEvent: events[0] ?? null,
    }
  }

  return {
    previousEvent: events[selectedEventIndex - 1] ?? null,
    nextEvent: events[selectedEventIndex + 1] ?? null,
  }
}
