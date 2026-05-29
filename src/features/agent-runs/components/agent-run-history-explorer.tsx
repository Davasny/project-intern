"use client"

import { useState } from "react"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { AgentRunHistoryEventDetail } from "@/features/agent-runs/components/agent-run-history-event-detail"
import { AgentRunHistoryEventList } from "@/features/agent-runs/components/agent-run-history-event-list"
import { AgentRunHistoryTimeline } from "@/features/agent-runs/components/agent-run-history-timeline"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"

type AgentRunHistoryExplorerProps = {
  events: Array<AgentRunHistoryEvent>
}

export const AgentRunHistoryExplorer = ({
  events,
}: AgentRunHistoryExplorerProps) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null
  const visibleSelectedEventId = selectedEvent?.id ?? null

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
          <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {events.length.toLocaleString()} events
          </span>
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
              <AgentRunHistoryTimeline
                events={events}
                onSelectEvent={setSelectedEventId}
                selectedEventId={visibleSelectedEventId}
              />
            </div>
            <div className="grid min-h-[620px] lg:grid-cols-[minmax(320px,42%)_minmax(0,1fr)]">
              <div className="min-h-0 border-border/70 lg:border-r">
                <AgentRunHistoryEventList
                  events={events}
                  onSelectEvent={setSelectedEventId}
                  selectedEventId={visibleSelectedEventId}
                />
              </div>
              <div className="min-w-0 bg-background/40">
                <AgentRunHistoryEventDetail event={selectedEvent} />
              </div>
            </div>
          </>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
