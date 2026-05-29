import { TRPCError } from "@trpc/server"
import { and, eq, gte, inArray } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { terminalTaskRecordStates } from "@/features/task-records/schemas/task-record-state"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ResetDownstreamTaskRecordsForRecordParams = {
  actorId: string
  organizationId: string
  projectId: string
  recordId: string
  taskRecordId: string
}

export const resetDownstreamTaskRecordsForRecord = async ({
  actorId,
  organizationId,
  projectId,
  recordId,
  taskRecordId,
}: ResetDownstreamTaskRecordsForRecordParams) => {
  const targetTaskRecord = await db
    .select({
      sortOrder: taskTable.sortOrder,
      taskId: taskTable.id,
      title: taskTable.title,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskRecordTable.id, taskRecordId),
        eq(taskRecordTable.recordId, recordId),
        eq(taskTable.projectId, projectId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!targetTaskRecord) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task record was not found.",
    })
  }

  const downstreamRecords = await db
    .select({
      id: taskRecordTable.id,
      taskId: taskRecordTable.taskId,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskRecordTable.recordId, recordId),
        eq(taskTable.projectId, projectId),
        gte(taskTable.sortOrder, targetTaskRecord.sortOrder),
        inArray(taskRecordTable.state, terminalTaskRecordStates),
      ),
    )

  if (downstreamRecords.length === 0) {
    logger.info(
      { projectId, recordId, taskRecordId },
      "No terminal downstream task-records to reset for record",
    )
    return { affectedTaskIds: [], resetCount: 0 }
  }

  let resetCount = 0
  const affectedTaskIds = new Set<string>()
  const resetTimestamp = new Date()

  for (const record of downstreamRecords) {
    try {
      const actor = await getTaskRecordActor(record.id)
      if (actor.nextEvents.includes("reset")) {
        await actor.send("reset", { lastTransitionAt: resetTimestamp })
        resetCount++
        affectedTaskIds.add(record.taskId)

        const scope = await getTaskRecordActivityScope(record.id)
        await createActivityLogEvent({
          actorId,
          actorType: "user",
          agentRunId: null,
          database: db,
          entityId: record.id,
          entityType: "taskRecord",
          eventType: "taskRecord.reset_downstream_for_record",
          organizationId,
          payload: {
            downstreamOfTaskTitle: targetTaskRecord.title,
            recordName: scope.recordName,
            taskTitle: scope.taskTitle,
          },
          projectId,
          recordId: scope.recordId,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: record.taskId,
          taskRecordId: record.id,
        })
      }
    } catch (error) {
      logger.warn(
        { error, taskRecordId: record.id },
        "Failed to reset downstream task-record for record",
      )
    }
  }

  logger.info(
    {
      affectedTaskIds: [...affectedTaskIds],
      projectId,
      recordId,
      resetCount,
      taskRecordId,
    },
    "Reset downstream task-records for record",
  )

  return {
    affectedTaskIds: [...affectedTaskIds],
    resetCount,
  }
}
