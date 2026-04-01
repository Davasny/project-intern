import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"

type RelationActivityItemProps = {
  activity: {
    createdAt: Date
    eventType: string
    payload: Record<string, unknown>
  }
}

const eventLabelMap: Record<string, string> = {
  "recordEdge.created": "Relation created",
  "recordEdge.deactivated": "Relation deactivated",
  "recordEdge.updated": "Relation updated",
}

const getStringPayloadValue = (
  payload: Record<string, unknown>,
  key: string,
) => {
  const value = payload[key]
  return typeof value === "string" ? value : ""
}

export const RelationActivityItem = ({
  activity,
}: RelationActivityItemProps) => {
  const relationType = getStringPayloadValue(activity.payload, "relationType")
  const relatedRecordName = getStringPayloadValue(
    activity.payload,
    "relatedRecordName",
  )

  return (
    <ActivityTimelineItem
      description={`${relationType || "relation"} · ${relatedRecordName || "linked record"}`}
      label={eventLabelMap[activity.eventType] ?? activity.eventType}
      timestamp={activity.createdAt.toLocaleString()}
    />
  )
}
