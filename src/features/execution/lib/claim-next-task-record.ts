import { claimAndCreateRun } from "@/features/execution/lib/execution-claim-service"
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
