"use client"

import { useAtom } from "jotai"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { InternRunHistoryEventDetail } from "@/features/intern-runs/components/intern-run-history-event-detail"
import { InternRunHistoryEventList } from "@/features/intern-runs/components/intern-run-history-event-list"
import { InternRunHistoryNavigation } from "@/features/intern-runs/components/intern-run-history-navigation"
import { InternRunHistoryTimeline } from "@/features/intern-runs/components/intern-run-history-timeline"
import { InternRunHistoryTypeFilter } from "@/features/intern-runs/components/intern-run-history-type-filter"
import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"
import { getInternRunHistoryAdjacentEvents } from "@/features/intern-runs/lib/get-intern-run-history-adjacent-events"
import { getInternRunHistoryVisibleEvents } from "@/features/intern-runs/lib/get-intern-run-history-visible-events"
import { internRunHistoryKindFilterAtom } from "@/features/intern-runs/state/intern-run-history-kind-filter-atom"
import { selectedInternRunHistoryEventIdAtom } from "@/features/intern-runs/state/selected-intern-run-history-event-id-atom"

type InternRunHistoryExplorerProps = {
  events: Array<InternRunHistoryEvent>
}

export const InternRunHistoryExplorer = ({
  events,
}: InternRunHistoryExplorerProps) => {
  const [selectedEventId, setSelectedEventId] = useAtom(
    selectedInternRunHistoryEventIdAtom,
  )
  const [selectedFilterKinds, setSelectedFilterKinds] = useAtom(
    internRunHistoryKindFilterAtom,
  )
  const visibleEvents = getInternRunHistoryVisibleEvents({
    events,
    selectedFilterKinds,
  })
  const selectedEvent =
    visibleEvents.find((event) => event.id === selectedEventId) ??
    visibleEvents[0] ??
    null
  const visibleSelectedEventId = selectedEvent?.id ?? null
  const { previousEvent, nextEvent } = getInternRunHistoryAdjacentEvents({
    events: visibleEvents,
    selectedEventId: visibleSelectedEventId,
  })

  return (
    <SectionCard className="gap-0 overflow-hidden p-0">
      <SectionCardHeader className="border-b border-border/70 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              OpenCode History
            </h2>
            <p className="text-xs text-muted-foreground">
              Timeline overview with event summaries and inspectable details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InternRunHistoryTypeFilter
              onSelectedFilterKindsChange={setSelectedFilterKinds}
              selectedFilterKinds={selectedFilterKinds}
            />
            <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {visibleEvents.length.toLocaleString()} events
            </span>
          </div>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="bg-card">
        {events.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No OpenCode messages were returned for this run.
          </p>
        ) : (
          <>
            <div className="border-b border-border/70 bg-muted/20 px-5 py-4">
              <InternRunHistoryNavigation
                nextEvent={nextEvent}
                onSelectEvent={setSelectedEventId}
                previousEvent={previousEvent}
              >
                  <InternRunHistoryTimeline
                  events={visibleEvents}
                  onSelectEvent={setSelectedEventId}
                  selectedEventId={visibleSelectedEventId}
                />
              </InternRunHistoryNavigation>
            </div>
            <div className="grid min-h-[620px] lg:grid-cols-[minmax(320px,42%)_minmax(0,1fr)]">
              <div className="min-h-0 border-border/70 lg:border-r">
                <InternRunHistoryEventList
                  events={visibleEvents}
                  onSelectEvent={setSelectedEventId}
                  selectedEventId={visibleSelectedEventId}
                />
              </div>
              <div className="min-w-0 bg-card">
                <InternRunHistoryEventDetail event={selectedEvent} />
              </div>
            </div>
          </>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
