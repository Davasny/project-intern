import { AgentRunHistoryTimelineItem } from "@/features/agent-runs/components/agent-run-history-timeline-item"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"

type AgentRunHistoryTimelineProps = {
  events: Array<AgentRunHistoryEvent>
  selectedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

export const AgentRunHistoryTimeline = ({
  events,
  selectedEventId,
  onSelectEvent,
}: AgentRunHistoryTimelineProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Timeline
      </h3>
      <span className="text-xs text-muted-foreground">Click any block to inspect</span>
    </div>
    <div className="grid grid-flow-col auto-cols-[minmax(0,3.75rem)] justify-start gap-1.5 px-0.5 py-1.5">
      {events.map((event, index) => (
        <AgentRunHistoryTimelineItem
          event={event}
          index={index}
          key={event.id}
          onSelectEvent={onSelectEvent}
          selectedEventId={selectedEventId}
        />
      ))}
    </div>
  </div>
)
