import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunById } from "@/features/agent-runs/lib/get-agent-run-by-id"
import { db } from "@/lib/db"

type GetAgentRunAttemptByAnchorRunIdParams = {
  agentRunId: string
  attemptNumber: number
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getAgentRunAttemptByAnchorRunId = async ({
  agentRunId,
  attemptNumber,
  organizationSlug,
  projectSlug,
  userId,
}: GetAgentRunAttemptByAnchorRunIdParams) => {
  const anchorRun = await getAgentRunById({
    agentRunId,
    organizationSlug,
    projectSlug,
    userId,
  })

  const selectedRuns = await db
    .select({ id: agentRunTable.id })
    .from(agentRunTable)
    .where(
      and(
        eq(agentRunTable.taskRecordId, anchorRun.taskRecordId),
        eq(agentRunTable.attemptNumber, attemptNumber),
      ),
    )
    .limit(1)

  const selectedRun = selectedRuns[0]

  if (!selectedRun) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent run attempt not found.",
    })
  }

  return getAgentRunById({
    agentRunId: selectedRun.id,
    organizationSlug,
    projectSlug,
    userId,
  })
}
