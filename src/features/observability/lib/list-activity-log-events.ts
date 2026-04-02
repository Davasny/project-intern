import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm"
import { activityLogTable } from "@/features/observability/db"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type ListActivityLogEventsParams = {
  projectId: string
  recordIds: string[]
  taskIds: string[]
}

export const listActivityLogEvents = async ({
  projectId,
  recordIds,
  taskIds,
}: ListActivityLogEventsParams) => {
  const scopeConditions: SQL[] = []

  if (recordIds.length > 0) {
    scopeConditions.push(inArray(activityLogTable.recordId, recordIds))
  }

  if (taskIds.length > 0) {
    scopeConditions.push(inArray(activityLogTable.taskId, taskIds))
  }

  const scopeFilter =
    scopeConditions.length > 0 ? or(...scopeConditions) : undefined

  return db
    .select({
      actorId: activityLogTable.actorId,
      actorType: activityLogTable.actorType,
      agentRunId: activityLogTable.agentRunId,
      createdAt: activityLogTable.createdAt,
      entityId: activityLogTable.entityId,
      entityType: activityLogTable.entityType,
      eventType: activityLogTable.eventType,
      id: activityLogTable.id,
      payload: activityLogTable.payload,
      projectDisplayName: projectTable.displayName,
      projectId: activityLogTable.projectId,
      recordId: activityLogTable.recordId,
      recordName: recordTable.name,
      taskId: activityLogTable.taskId,
      taskRecordId: activityLogTable.taskRecordId,
      taskTitle: taskTable.title,
    })
    .from(activityLogTable)
    .leftJoin(projectTable, eq(activityLogTable.projectId, projectTable.id))
    .leftJoin(recordTable, eq(activityLogTable.recordId, recordTable.id))
    .leftJoin(taskTable, eq(activityLogTable.taskId, taskTable.id))
    .where(
      scopeFilter
        ? and(eq(activityLogTable.projectId, projectId), scopeFilter)
        : eq(activityLogTable.projectId, projectId),
    )
    .orderBy(desc(activityLogTable.createdAt))
}
