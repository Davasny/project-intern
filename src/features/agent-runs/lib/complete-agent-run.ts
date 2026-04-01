import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { completeTaskRecord } from "@/features/task-records/lib/complete-task-record"
import { db } from "@/lib/db"

type CompleteAgentRunParams = {
  agentRunId: string
  costUsd: string | null
  latencyMs: number | null
  resultPayload: Record<string, unknown> | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const completeAgentRun = async ({
  agentRunId,
  costUsd,
  latencyMs,
  resultPayload,
  taskRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: CompleteAgentRunParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("complete")
  await db
    .update(agentRunTable)
    .set({
      costUsd,
      latencyMs,
      resultPayload,
      tokenInput,
      tokenOutput,
      toolActivitySummary,
    })
    .where(eq(agentRunTable.id, agentRunId))
  await completeTaskRecord({ agentRunId, taskRecordId })
  return actor
}
