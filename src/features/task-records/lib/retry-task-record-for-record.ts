import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { claimTaskRecordForManualTrigger } from "@/features/execution/lib/claim-task-record-for-manual-trigger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { taskRecordTable } from "@/features/task-records/db"
import { retryTaskRecord } from "@/features/task-records/lib/retry-task-record"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type RetryTaskRecordForRecordParams = {
  actorId: string
  organizationId: string
  projectId: string
  recordId: string
  taskRecordId: string
}

export const retryTaskRecordForRecord = async ({
  actorId,
  organizationId,
  projectId,
  recordId,
  taskRecordId,
}: RetryTaskRecordForRecordParams) => {
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

  if (taskRecord.state !== "failed" && taskRecord.state !== "skipped") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only failed or skipped task records can be retried.",
    })
  }

  await retryTaskRecord(taskRecord.id)

  const activityScope = await getTaskRecordActivityScope(taskRecord.id)

  await createActivityLogEvent({
    actorId,
    actorType: "user",
    agentRunId: null,
    database: db,
    entityId: taskRecord.id,
    entityType: "taskRecord",
    eventType: "taskRecord.retried",
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

  const claimedTaskRecord = await claimTaskRecordForManualTrigger({
    projectId,
    taskRecordId: taskRecord.id,
  })

  if (!claimedTaskRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task record could not be scheduled for retry.",
    })
  }

  const jobId = await executionQueueService.enqueueTaskRecordExecution({
    agentRunId: claimedTaskRecord.agentRunId,
    taskRecordId: claimedTaskRecord.taskRecordId,
  })

  if (jobId === null) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task retry could not enqueue execution.",
    })
  }

  return {
    ...claimedTaskRecord,
    jobId,
  }
}
