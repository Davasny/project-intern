import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"

type GetInternRunHistoryAdjacentEventsInput = {
  events: Array<InternRunHistoryEvent>
  selectedEventId: string | null
}

export const getInternRunHistoryAdjacentEvents = ({
  events,
  selectedEventId,
}: GetInternRunHistoryAdjacentEventsInput) => {
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
