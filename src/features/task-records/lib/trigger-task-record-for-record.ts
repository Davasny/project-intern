import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { taskRecordTable } from "@/features/task-records/db"
import { launchTaskRecordExecution } from "@/features/task-records/lib/launch-task-record-execution"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type TriggerTaskRecordForRecordParams = {
  actorId: string
  organizationId: string
  projectId: string
  recordId: string
  taskRecordId: string
}

export const triggerTaskRecordForRecord = async ({
  actorId,
  organizationId,
  projectId,
  recordId,
  taskRecordId,
}: TriggerTaskRecordForRecordParams) => {
  const taskRecord = await db
    .select({
      id: taskRecordTable.id,
      state: taskRecordTable.state,
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

  if (!taskRecord) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task record was not found.",
    })
  }

  if (taskRecord.state !== "waiting") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only waiting task records can be triggered.",
    })
  }

  const claimedTaskRecord = await launchTaskRecordExecution({
    projectId,
    taskRecordId: taskRecord.id,
  })

  if (!claimedTaskRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Task record is not eligible for triggering. It may already be activated by another run.",
    })
  }

  const activityScope = await getTaskRecordActivityScope(
    claimedTaskRecord.taskRecordId,
  )

  await createActivityLogEvent({
    actorId,
    actorType: "user",
    agentRunId: null,
    database: db,
    entityId: claimedTaskRecord.taskRecordId,
    entityType: "taskRecord",
    eventType: "taskRecord.triggered",
    organizationId,
    payload: {
      recordName: activityScope.recordName,
      taskTitle: activityScope.taskTitle,
    },
    projectId,
    recordId,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: activityScope.taskId,
    taskRecordId: activityScope.taskRecordId,
  })

  await createActivityLogEvent({
    actorId: claimedTaskRecord.agentRunId,
    actorType: "executor",
    agentRunId: claimedTaskRecord.agentRunId,
    database: db,
    entityId: claimedTaskRecord.taskRecordId,
    entityType: "taskRecord",
    eventType: "taskRecord.claimed",
    organizationId: claimedTaskRecord.organizationId,
    payload: {
      manualTrigger: true,
      recordId: claimedTaskRecord.recordId,
      taskId: claimedTaskRecord.taskId,
    },
    projectId: claimedTaskRecord.projectId,
    recordId: claimedTaskRecord.recordId,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: claimedTaskRecord.taskId,
    taskRecordId: claimedTaskRecord.taskRecordId,
  })

  const jobId = await executionQueueService.enqueueTaskRecordExecution({
    agentRunId: claimedTaskRecord.agentRunId,
    taskRecordId: claimedTaskRecord.taskRecordId,
  })

  if (jobId === null) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task trigger could not enqueue execution.",
    })
  }

  return {
    ...claimedTaskRecord,
    jobId,
  }
}
