import { eq } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type FailTaskRecordParams = {
  agentRunId: string | null
  errorCode: string
  taskRecordId: string
}

export const failTaskRecord = async ({
  agentRunId,
  errorCode,
  taskRecordId,
}: FailTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("fail")
  await db
    .update(taskRecordTable)
    .set({
      agentRunId,
      errorCode,
      lastTransitionAt: new Date(),
    })
    .where(eq(taskRecordTable.id, taskRecordId))

  const activityScope = await getTaskRecordActivityScope(taskRecordId)

  await createActivityLogEvent({
    actorId: agentRunId,
    actorType: "executor",
    agentRunId,
    entityId: taskRecordId,
    entityType: "taskRecord",
    eventType: "taskRecord.failed",
    organizationId: activityScope.organizationId,
    payload: {
      errorCode,
      recordName: activityScope.recordName,
      taskTitle: activityScope.taskTitle,
    },
    projectId: activityScope.projectId,
    recordId: activityScope.recordId,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: activityScope.taskId,
    taskRecordId: activityScope.taskRecordId,
  })

  logger.warn({ agentRunId, errorCode, taskRecordId }, "Failed task record")

  return actor
}
