import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"
import {
  type InternRunHistoryFilterKind,
  internRunHistoryFilterKinds,
} from "@/features/intern-runs/lib/intern-run-history-filter-kind"

type GetInternRunHistoryVisibleEventsInput = {
  events: Array<InternRunHistoryEvent>
  selectedFilterKinds: Array<InternRunHistoryFilterKind>
}

const isFilterKind = (
  kind: InternRunHistoryEvent["kind"],
): kind is InternRunHistoryFilterKind =>
  internRunHistoryFilterKinds.some((filterKind) => filterKind === kind)

export const getInternRunHistoryVisibleEvents = ({
  events,
  selectedFilterKinds,
}: GetInternRunHistoryVisibleEventsInput) => {
  return events.filter(
    (event) =>
      !isFilterKind(event.kind) || selectedFilterKinds.includes(event.kind),
  )
}
