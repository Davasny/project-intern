import { claimTaskRecordCandidate } from "@/features/execution/lib/claim-task-record-candidate"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { launchTaskRecordExecution } from "@/features/task-records/lib/launch-task-record-execution"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const claimNextTaskRecord = async () => {
  try {
    const candidate = await claimTaskRecordCandidate({
      mode: "autopick",
    })

    if (!candidate) {
      return null
    }

    const claimedTaskRecord = await launchTaskRecordExecution({
      projectId: candidate.projectId,
      taskRecordId: candidate.taskRecordId,
    })

    if (!claimedTaskRecord) {
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

    return claimedTaskRecord
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
