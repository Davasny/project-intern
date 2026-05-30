"use client"

import { useAtom } from "jotai"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { AgentRunHistoryEventDetail } from "@/features/agent-runs/components/agent-run-history-event-detail"
import { AgentRunHistoryEventList } from "@/features/agent-runs/components/agent-run-history-event-list"
import { AgentRunHistoryMetadataFilter } from "@/features/agent-runs/components/agent-run-history-metadata-filter"
import { AgentRunHistoryNavigation } from "@/features/agent-runs/components/agent-run-history-navigation"
import { AgentRunHistoryTimeline } from "@/features/agent-runs/components/agent-run-history-timeline"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"
import { getAgentRunHistoryAdjacentEvents } from "@/features/agent-runs/lib/get-agent-run-history-adjacent-events"
import { getAgentRunHistoryVisibleEvents } from "@/features/agent-runs/lib/get-agent-run-history-visible-events"
import { hideAgentRunHistoryMetadataAtom } from "@/features/agent-runs/state/hide-agent-run-history-metadata-atom"
import { selectedAgentRunHistoryEventIdAtom } from "@/features/agent-runs/state/selected-agent-run-history-event-id-atom"

type AgentRunHistoryExplorerProps = {
  events: Array<AgentRunHistoryEvent>
}

export const AgentRunHistoryExplorer = ({
  events,
}: AgentRunHistoryExplorerProps) => {
  const [selectedEventId, setSelectedEventId] = useAtom(
    selectedAgentRunHistoryEventIdAtom,
  )
  const [hideMetadata, setHideMetadata] = useAtom(hideAgentRunHistoryMetadataAtom)
  const visibleEvents = getAgentRunHistoryVisibleEvents({
    events,
    hideMetadata,
  })
  const selectedEvent =
    visibleEvents.find((event) => event.id === selectedEventId) ??
    visibleEvents[0] ??
    null
  const visibleSelectedEventId = selectedEvent?.id ?? null
  const { previousEvent, nextEvent } = getAgentRunHistoryAdjacentEvents({
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
            <AgentRunHistoryMetadataFilter
              hideMetadata={hideMetadata}
              onHideMetadataChange={setHideMetadata}
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
              <AgentRunHistoryNavigation
                nextEvent={nextEvent}
                onSelectEvent={setSelectedEventId}
                previousEvent={previousEvent}
              >
                  <AgentRunHistoryTimeline
                  events={visibleEvents}
                  onSelectEvent={setSelectedEventId}
                  selectedEventId={visibleSelectedEventId}
                />
              </AgentRunHistoryNavigation>
            </div>
            <div className="grid min-h-[620px] lg:grid-cols-[minmax(320px,42%)_minmax(0,1fr)]">
              <div className="min-h-0 border-border/70 lg:border-r">
                <AgentRunHistoryEventList
                  events={visibleEvents}
                  onSelectEvent={setSelectedEventId}
                  selectedEventId={visibleSelectedEventId}
                />
              </div>
              <div className="min-w-0 bg-card">
                <AgentRunHistoryEventDetail event={selectedEvent} />
              </div>
            </div>
          </>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
