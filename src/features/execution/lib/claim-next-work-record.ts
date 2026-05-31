import { claimAndCreateRun } from "@/features/execution/lib/execution-claim-service"
import { logger } from "@/lib/logger"

export const claimNextWorkRecord = async () => {
  try {
    const claimedWorkRecord = await claimAndCreateRun({
      requestedBy: "scheduler",
    })

    if (
      claimedWorkRecord.status !== "claimed" &&
      claimedWorkRecord.status !== "already_claimed"
    ) {
      return null
    }

    logger.info(claimedWorkRecord, "Claimed next work record")

    return {
      internRunId: claimedWorkRecord.internRunId,
      organizationId: claimedWorkRecord.organizationId,
      projectId: claimedWorkRecord.projectId,
      recordId: claimedWorkRecord.recordId,
      taskId: claimedWorkRecord.taskId,
      workRecordId: claimedWorkRecord.workRecordId,
    }
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      logger.warn({ error }, "Skipped conflicting work record claim")
      return null
    }

    throw error
  }
}
