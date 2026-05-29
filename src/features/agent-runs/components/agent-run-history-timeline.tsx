import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"
import { cn } from "@/lib/utils"

type AgentRunHistoryTimelineProps = {
  events: Array<AgentRunHistoryEvent>
  selectedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

const eventKindClasses = {
  agent: "bg-tone-success-foreground/75",
  error: "bg-tone-danger-foreground/80",
  file: "bg-muted-foreground/35",
  reasoning: "bg-tone-info-foreground/75",
  tool: "bg-foreground/55",
}

const isTimelineEvent = (
  event: AgentRunHistoryEvent,
): event is AgentRunHistoryEvent & {
  kind: Exclude<AgentRunHistoryEvent["kind"], "metadata">
} => event.kind !== "metadata"

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
      {events
        .filter(isTimelineEvent)
        .map((event, index) => (
        <button
          aria-label={`Select event ${String(index + 1)}: ${event.title}`}
          className={cn(
            "group relative h-8 min-w-0 overflow-hidden rounded-md border border-border/60 transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            eventKindClasses[event.kind],
            selectedEventId === event.id
              ? "border-foreground/60 ring-2 ring-ring ring-offset-1 ring-offset-card"
              : null,
          )}
          key={event.id}
          onClick={() => onSelectEvent(event.id)}
          title={`${event.kind}: ${event.summary}`}
          type="button"
        >
          <span className="absolute inset-x-1 top-1 h-0.5 rounded-full bg-background/35" />
          <span className="sr-only">{event.title}</span>
        </button>
        ))}
    </div>
  </div>
)
