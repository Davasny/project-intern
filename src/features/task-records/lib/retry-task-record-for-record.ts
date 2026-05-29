import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { releaseClaimedTaskRecord } from "@/features/execution/lib/execution-claim-service"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { taskRecordTable } from "@/features/task-records/db"
import { launchTaskRecordExecution } from "@/features/task-records/lib/launch-task-record-execution"
import { retryableTaskRecordStates } from "@/features/task-records/schemas/task-record-state"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

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

  if (
    !retryableTaskRecordStates.includes(
      taskRecord.state as (typeof retryableTaskRecordStates)[number],
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only retryable task records can be retried.",
    })
  }

  const claimedTaskRecord = await launchTaskRecordExecution({
    projectId,
    taskRecordId: taskRecord.id,
  })

  if (!claimedTaskRecord) {
    logger.warn(
      { taskRecordId, state: taskRecord.state },
      "launchTaskRecordExecution returned null — see preceding launchTaskRecordExecution warnings for reason",
    )

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task record could not be scheduled for retry.",
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
      retry: true,
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
    executionLogger.error(
      {
        agentRunId: claimedTaskRecord.agentRunId,
        taskRecordId: claimedTaskRecord.taskRecordId,
        requestedBy: "retry",
      },
      "Failed to enqueue claimed task record",
    )

    await releaseClaimedTaskRecord({
      agentRunId: claimedTaskRecord.agentRunId,
      reason: "ENQUEUE_FAILED",
      taskRecordId: claimedTaskRecord.taskRecordId,
    })

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task retry could not enqueue execution.",
    })
  }

  executionLogger.info(
    {
      agentRunId: claimedTaskRecord.agentRunId,
      jobId,
      requestedBy: "retry",
      taskRecordId: claimedTaskRecord.taskRecordId,
    },
    "Enqueued claimed task record",
  )

  return {
    ...claimedTaskRecord,
    jobId,
  }
}
