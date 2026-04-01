import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { failTaskRecord } from "@/features/task-records/lib/fail-task-record"
import { db } from "@/lib/db"

type FailAgentRunParams = {
  agentRunId: string
  costUsd: string | null
  errorCode: string
  failurePayload: Record<string, unknown>
  latencyMs: number | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const failAgentRun = async ({
  agentRunId,
  costUsd,
  errorCode,
  failurePayload,
  latencyMs,
  taskRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: FailAgentRunParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("fail")
  await db
    .update(agentRunTable)
    .set({
      costUsd,
      failurePayload,
      latencyMs,
      tokenInput,
      tokenOutput,
      toolActivitySummary,
    })
    .where(eq(agentRunTable.id, agentRunId))
  await failTaskRecord({ agentRunId, errorCode, taskRecordId })
  return actor
}
