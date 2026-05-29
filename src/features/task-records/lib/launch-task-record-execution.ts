import { TRPCError } from "@trpc/server"
import {
  type ClaimedTaskRecordExecution,
  claimAndCreateRun,
} from "@/features/execution/lib/execution-claim-service"

type LaunchTaskRecordExecutionParams = {
  projectId: string
  requestedBy?: "manual" | "retry"
  taskRecordId: string
}

export const launchTaskRecordExecution = async ({
  projectId,
  requestedBy = "manual",
  taskRecordId,
}: LaunchTaskRecordExecutionParams): Promise<ClaimedTaskRecordExecution | null> => {
  const claimResult = await claimAndCreateRun({
    projectId,
    requestedBy,
    taskRecordId,
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
            : "Task record claim failed.",
      })
    }

    return null
  }

  return {
    agentRunId: claimResult.agentRunId,
    organizationId: claimResult.organizationId,
    projectId: claimResult.projectId,
    recordId: claimResult.recordId,
    taskId: claimResult.taskId,
    taskRecordId: claimResult.taskRecordId,
  }
}
