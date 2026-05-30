import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { releaseClaimedTaskRecord } from "@/features/execution/lib/execution-claim-service"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { taskRecordTable } from "@/features/task-records/db"
import { launchTaskRecordExecution } from "@/features/task-records/lib/launch-task-record-execution"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type TriggerTaskRecordForRecordParams = {
  projectId: string
  recordId: string
  taskRecordId: string
}

export const triggerTaskRecordForRecord = async ({
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
    logger.warn(
      { taskRecordId, state: taskRecord.state },
      "launchTaskRecordExecution returned null — see preceding launchTaskRecordExecution warnings for reason",
    )

    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Task record is not eligible for triggering. It may already be activated by another run.",
    })
  }

  const jobId = await executionQueueService.enqueueTaskRecordExecution({
    agentRunId: claimedTaskRecord.agentRunId,
    taskRecordId: claimedTaskRecord.taskRecordId,
  })

  if (jobId === null) {
    executionLogger.error(
      {
        agentRunId: claimedTaskRecord.agentRunId,
        taskRecordId: claimedTaskRecord.taskRecordId,
        requestedBy: "manual",
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
      message: "Task trigger could not enqueue execution.",
    })
  }

  executionLogger.info(
    {
      agentRunId: claimedTaskRecord.agentRunId,
      jobId,
      requestedBy: "manual",
      taskRecordId: claimedTaskRecord.taskRecordId,
    },
    "Enqueued claimed task record",
  )

  return {
    ...claimedTaskRecord,
    jobId,
  }
}
