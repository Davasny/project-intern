import { claimAndCreateRun } from "@/features/execution/lib/execution-claim-service"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const claimNextTaskRecord = async () => {
  try {
    const claimedTaskRecord = await claimAndCreateRun({
      requestedBy: "scheduler",
    })

    if (
      claimedTaskRecord.status !== "claimed" &&
      claimedTaskRecord.status !== "already_claimed"
    ) {
      return null
    }

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

    logger.info(claimedTaskRecord, "Claimed next task record")

    return {
      agentRunId: claimedTaskRecord.agentRunId,
      organizationId: claimedTaskRecord.organizationId,
      projectId: claimedTaskRecord.projectId,
      recordId: claimedTaskRecord.recordId,
      taskId: claimedTaskRecord.taskId,
      taskRecordId: claimedTaskRecord.taskRecordId,
    }
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      logger.warn({ error }, "Skipped conflicting task record claim")
      return null
    }

    throw error
  }
}
