import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"

type TaskRevisionItemProps = {
  revision: {
    createdAt: Date
    revisionNumber: number
  }
}

export const TaskRevisionItem = ({ revision }: TaskRevisionItemProps) => (
  <ActivityTimelineItem
    description={`Revision ${revision.revisionNumber}`}
    label="Description revised"
    timestamp={revision.createdAt.toLocaleString()}
  />
)
