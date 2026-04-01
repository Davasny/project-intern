import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"
import { formatActivityLogEntry } from "@/features/observability/lib/format-activity-log-entry"

type ActivityLogItemProps = {
  event: {
    createdAt: Date
    eventType: string
    payload: Record<string, unknown>
    recordName: string | null
    taskTitle: string | null
  }
}

export const ActivityLogItem = ({ event }: ActivityLogItemProps) => {
  const content = formatActivityLogEntry(event)

  return (
    <ActivityTimelineItem
      description={content.description}
      label={content.label}
      timestamp={event.createdAt.toLocaleString()}
    />
  )
}
