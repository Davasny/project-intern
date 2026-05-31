import type { StatusBadgeTone } from "@/components/ui/status-badge/status-badge"
import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"
import { getInternRunHistoryEventTone } from "@/features/intern-runs/lib/get-intern-run-history-event-tone"
import { cn } from "@/lib/utils"

type InternRunHistoryTimelineItemProps = {
  event: InternRunHistoryEvent
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
  skill: {
    default: "border-tone-skill bg-tone-skill-bg hover:bg-tone-skill-bg/80",
    selected: "border-tone-skill bg-tone-skill-foreground/75",
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

const getTimelineEventClasses = (event: InternRunHistoryEvent) => {
  const tone = getInternRunHistoryEventTone(event)

  return timelineToneClasses[tone]
}

export const InternRunHistoryTimelineItem = ({
  event,
  index,
  onSelectEvent,
  selectedEventId,
}: InternRunHistoryTimelineItemProps) => {
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
