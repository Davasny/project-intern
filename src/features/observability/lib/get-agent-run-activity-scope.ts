import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { db } from "@/lib/db"

export const getAgentRunActivityScope = async (agentRunId: string) => {
  const agentRun = await db
    .select({
      id: agentRunTable.id,
      attemptNumber: agentRunTable.attemptNumber,
      taskRecordId: agentRunTable.taskRecordId,
    })
    .from(agentRunTable)
    .where(eq(agentRunTable.id, agentRunId))
    .then((rows) => rows[0] ?? null)

  if (!agentRun) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent run activity scope was not found.",
    })
  }

  const taskRecordScope = await getTaskRecordActivityScope(
    agentRun.taskRecordId,
  )

  return {
    ...taskRecordScope,
    agentRunId: agentRun.id,
    attemptNumber: agentRun.attemptNumber,
  }
}
