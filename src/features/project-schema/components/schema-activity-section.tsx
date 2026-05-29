import { ChevronDown } from "lucide-react"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { formatActivityLogEntry } from "@/features/observability/lib/format-activity-log-entry"
import { cn } from "@/lib/utils"

type SchemaActivityEvent = {
  createdAt: Date
  eventType: Parameters<typeof formatActivityLogEntry>[0]["eventType"]
  id: string
  payload: Record<string, unknown>
  taskTitle: string | null
}

type SchemaActivitySectionProps = {
  events: SchemaActivityEvent[]
  isExpanded: boolean
  onToggle: () => void
}

export const SchemaActivitySection = ({
  events,
  isExpanded,
  onToggle,
}: SchemaActivitySectionProps) => (
  <SectionCard>
    <button
      className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      onClick={onToggle}
      type="button"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">
          Latest schema activity
        </h2>
        <p className="text-sm text-muted-foreground">
          Recent schema version, migration, and migration-task events.
        </p>
      </div>
      <ChevronDown
        className={cn(
          "h-5 w-5 text-muted-foreground transition-transform",
          isExpanded && "rotate-180",
        )}
      />
    </button>
    {isExpanded ? (
      <SectionCardContent className="border-t border-border pt-4">
        <ActivityTimeline>
          {events.map((event) => {
            const activityEntry = formatActivityLogEntry({
              createdAt: event.createdAt,
              eventType: event.eventType,
              payload: event.payload,
              recordName: null,
              taskTitle: event.taskTitle,
            })

            return (
              <ActivityTimelineItem
                description={activityEntry.description}
                key={event.id}
                label={activityEntry.label}
                timestamp={event.createdAt.toLocaleString()}
              />
            )
          })}
        </ActivityTimeline>
      </SectionCardContent>
    ) : null}
  </SectionCard>
)
