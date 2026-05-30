import type { StatusBadgeTone } from "@/components/ui/status-badge/status-badge"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"
import { agentRunHistoryEventKindTone } from "@/features/agent-runs/lib/agent-run-history-event-kind-tone"
import { cn } from "@/lib/utils"

type AgentRunHistoryTimelineItemProps = {
  event: AgentRunHistoryEvent
  index: number
  onSelectEvent: (eventId: string) => void
  selectedEventId: string | null
}

const timelineToneClasses = {
  danger: {
    default: "border-tone-danger bg-tone-danger-bg hover:bg-tone-danger-bg/80",
    selected: "border-tone-danger bg-tone-danger-foreground/75",
  },
  info: {
    default: "border-tone-info bg-tone-info-bg hover:bg-tone-info-bg/80",
    selected: "border-tone-info bg-tone-info-foreground/75",
  },
  muted: {
    default: "border-tone-muted bg-tone-muted-bg hover:bg-tone-muted-bg/80",
    selected: "border-tone-muted bg-tone-muted-foreground/75",
  },
  success: {
    default: "border-tone-success bg-tone-success-bg hover:bg-tone-success-bg/80",
    selected: "border-tone-success bg-tone-success-foreground/75",
  },
  warning: {
    default: "border-tone-warning bg-tone-warning-bg hover:bg-tone-warning-bg/80",
    selected: "border-tone-warning bg-tone-warning-foreground/75",
  },
} satisfies Record<StatusBadgeTone, { default: string; selected: string }>

const getTimelineEventClasses = (event: AgentRunHistoryEvent) => {
  const tone = agentRunHistoryEventKindTone[event.kind]

  return timelineToneClasses[tone]
}

export const AgentRunHistoryTimelineItem = ({
  event,
  index,
  onSelectEvent,
  selectedEventId,
}: AgentRunHistoryTimelineItemProps) => {
  const eventClasses = getTimelineEventClasses(event)

  return (
    <button
      aria-label={`Select event ${String(index + 1)}: ${event.title}`}
      className={cn(
        "group relative h-8 min-w-0 overflow-hidden rounded-md border transition hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selectedEventId === event.id
          ? cn(
              eventClasses.selected,
              "ring-2 ring-ring ring-offset-1 ring-offset-card",
            )
          : eventClasses.default,
      )}
      onClick={() => onSelectEvent(event.id)}
      title={`${event.kind}: ${event.summary}`}
      type="button"
    >
      <span className="absolute inset-x-1 top-1 h-0.5 rounded-full bg-background/35" />
      <span className="sr-only">{event.title}</span>
    </button>
  )
}
