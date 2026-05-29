import { TRPCError } from "@trpc/server"
import { and, eq, gt, inArray } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { terminalTaskRecordStates } from "@/features/task-records/schemas/task-record-state"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ResetDownstreamTaskRecordsParams = {
  organizationId: string
  projectId: string
  taskId: string
}

export const resetDownstreamTaskRecords = async ({
  organizationId,
  projectId,
  taskId,
}: ResetDownstreamTaskRecordsParams) => {
  const targetTask = await db
    .select({ sortOrder: taskTable.sortOrder, title: taskTable.title })
    .from(taskTable)
    .where(and(eq(taskTable.id, taskId), eq(taskTable.projectId, projectId)))
    .then((rows) => rows[0] ?? null)

  if (!targetTask) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task not found.",
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
        eq(taskTable.projectId, projectId),
        gt(taskTable.sortOrder, targetTask.sortOrder),
        inArray(taskRecordTable.state, terminalTaskRecordStates),
      ),
    )

  if (downstreamRecords.length === 0) {
    logger.info(
      { taskId, projectId },
      "No terminal downstream task-records to reset",
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
          actorId: null,
          actorType: "system",
          agentRunId: null,
          database: db,
          entityId: record.id,
          entityType: "taskRecord",
          eventType: "taskRecord.reset_downstream",
          organizationId,
          payload: {
            downstreamOfTaskTitle: targetTask.title,
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
        "Failed to reset downstream task-record",
      )
    }
  }

  logger.info(
    {
      affectedTaskIds: [...affectedTaskIds],
      projectId,
      resetCount,
      taskId,
    },
    "Reset downstream task-records",
  )

  return {
    affectedTaskIds: [...affectedTaskIds],
    resetCount,
  }
}
