import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"

type GetInternRunHistoryVisibleEventsInput = {
  events: Array<InternRunHistoryEvent>
  hideMetadata: boolean
}

export const getInternRunHistoryVisibleEvents = ({
  events,
  hideMetadata,
}: GetInternRunHistoryVisibleEventsInput) =>
  hideMetadata ? events.filter((event) => event.kind !== "metadata") : events
