import { activityLogTable } from "@/features/observability/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type CreateActivityLogEventParams = {
  actorId: string | null
  actorType: "executor" | "system" | "user"
  agentRunId: string | null
  entityId: string | null
  entityType: string
  eventType: string
  organizationId: string
  payload: Record<string, unknown>
  projectId: string
  recordId: string | null
  relatedProjectId: string | null
  relatedRecordId: string | null
  taskId: string | null
  taskRecordId: string | null
}

export const createActivityLogEvent = async ({
  actorId,
  actorType,
  agentRunId,
  entityId,
  entityType,
  eventType,
  organizationId,
  payload,
  projectId,
  recordId,
  relatedProjectId,
  relatedRecordId,
  taskId,
  taskRecordId,
}: CreateActivityLogEventParams) => {
  logger.info(
    {
      actorId,
      actorType,
      agentRunId,
      entityId,
      entityType,
      eventType,
      organizationId,
      projectId,
      recordId,
      relatedProjectId,
      relatedRecordId,
      taskId,
      taskRecordId,
    },
    "Persisting activity log event",
  )

  await db.insert(activityLogTable).values({
    actorId,
    actorType,
    agentRunId,
    entityId,
    entityType,
    eventType,
    organizationId,
    payload,
    projectId,
    recordId,
    relatedProjectId,
    relatedRecordId,
    taskId,
    taskRecordId,
  })
}
