import { activityLogTable } from "@/features/record-edges/db"
import { db } from "@/lib/db"

type CreateActivityLogParams = {
  actorId: string | null
  actorType: "executor" | "system" | "user"
  entityId: string
  eventType: string
  payload: Record<string, unknown>
  projectId: string
  recordId: string
  relatedProjectId: string
  relatedRecordId: string
}

export const createActivityLog = async ({
  actorId,
  actorType,
  entityId,
  eventType,
  payload,
  projectId,
  recordId,
  relatedProjectId,
  relatedRecordId,
}: CreateActivityLogParams) =>
  db.insert(activityLogTable).values({
    actorId,
    actorType,
    entityId,
    entityType: "recordEdge",
    eventType,
    payload,
    projectId,
    recordId,
    relatedProjectId,
    relatedRecordId,
  })
