import { TRPCError } from "@trpc/server"
import {
  type ClaimedWorkRecordExecution,
  claimAndCreateRun,
} from "@/features/execution/lib/execution-claim-service"

type LaunchWorkRecordExecutionParams = {
  projectId: string
  requestedBy?: "manual" | "retry"
  workRecordId: string
}

export const launchWorkRecordExecution = async ({
  projectId,
  requestedBy = "manual",
  workRecordId,
}: LaunchWorkRecordExecutionParams): Promise<ClaimedWorkRecordExecution | null> => {
  const claimResult = await claimAndCreateRun({
    projectId,
    requestedBy,
    workRecordId,
  })

  if (
    claimResult.status !== "claimed" &&
    claimResult.status !== "already_claimed"
  ) {
    if (claimResult.status === "claim_failed") {
      if (claimResult.error instanceof TRPCError) {
        throw claimResult.error
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          claimResult.error instanceof Error
            ? claimResult.error.message
            : "Work record claim failed.",
      })
    }

    return null
  }

  return {
    internRunId: claimResult.internRunId,
    organizationId: claimResult.organizationId,
    projectId: claimResult.projectId,
    recordId: claimResult.recordId,
    taskId: claimResult.taskId,
    workRecordId: claimResult.workRecordId,
  }
}
