import { eq } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectTable } from "@/features/projects/db"
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
}: CreateActivityLogParams) => {
  const project = await db
    .select({ organizationId: projectTable.organizationId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  if (!project) {
    return
  }

  await createActivityLogEvent({
    actorId,
    actorType,
    agentRunId: actorType === "executor" ? actorId : null,
    entityId,
    entityType: "recordEdge",
    eventType,
    organizationId: project.organizationId,
    payload,
    projectId,
    recordId,
    relatedProjectId,
    relatedRecordId,
    taskId: null,
    taskRecordId: null,
  })
}
