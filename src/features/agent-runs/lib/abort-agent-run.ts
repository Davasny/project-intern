import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { skipTaskRecord } from "@/features/task-records/lib/skip-task-record"
import { db } from "@/lib/db"

type AbortAgentRunParams = {
  agentRunId: string
  failurePayload: Record<string, unknown> | null
  taskRecordId: string
  toolActivitySummary: Record<string, unknown>
}

export const abortAgentRun = async ({
  agentRunId,
  failurePayload,
  taskRecordId,
  toolActivitySummary,
}: AbortAgentRunParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("abort")
  await db
    .update(agentRunTable)
    .set({ failurePayload, toolActivitySummary })
    .where(eq(agentRunTable.id, agentRunId))
  await skipTaskRecord({
    agentRunId,
    errorCode: null,
    taskRecordId,
  })
  return actor
}
