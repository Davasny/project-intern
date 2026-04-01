import { eq } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { finalizeProjectSchemaMigration } from "@/features/project-schema/lib/finalize-project-schema-migration"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type CompleteTaskRecordParams = {
  agentRunId: string
  taskRecordId: string
}

export const completeTaskRecord = async ({
  agentRunId,
  taskRecordId,
}: CompleteTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("complete")
  await db
    .update(taskRecordTable)
    .set({
      agentRunId,
      errorCode: null,
      lastTransitionAt: new Date(),
    })
    .where(eq(taskRecordTable.id, taskRecordId))

  const activityScope = await getTaskRecordActivityScope(taskRecordId)

  await createActivityLogEvent({
    actorId: agentRunId,
    actorType: "executor",
    agentRunId,
    database: db,
    entityId: taskRecordId,
    entityType: "taskRecord",
    eventType: "taskRecord.completed",
    organizationId: activityScope.organizationId,
    payload: {
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

  await finalizeProjectSchemaMigration({ taskId: activityScope.taskId })

  logger.info({ agentRunId, taskRecordId }, "Completed task record")

  return actor
}
