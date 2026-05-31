import { InternRunHistoryTimelineItem } from "@/features/intern-runs/components/intern-run-history-timeline-item"
import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"

type InternRunHistoryTimelineProps = {
  events: Array<InternRunHistoryEvent>
  selectedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

export const InternRunHistoryTimeline = ({
  events,
  selectedEventId,
  onSelectEvent,
}: InternRunHistoryTimelineProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Timeline
      </h3>
      <span className="text-xs text-muted-foreground">Click any block to inspect</span>
    </div>
    <div className="grid grid-flow-col auto-cols-[minmax(0,3.75rem)] justify-start gap-1.5 px-0.5 py-1.5">
      {events.map((event, index) => (
        <InternRunHistoryTimelineItem
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
