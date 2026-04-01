import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { db } from "@/lib/db"

type MarkAgentRunRunningParams = {
  agentRunId: string
  latencyMs: number | null
  sessionReference: string | null
  tokenInput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const markAgentRunRunning = async ({
  agentRunId,
  latencyMs,
  sessionReference,
  tokenInput,
  toolActivitySummary,
}: MarkAgentRunRunningParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("run")
  await db
    .update(agentRunTable)
    .set({ latencyMs, sessionReference, tokenInput, toolActivitySummary })
    .where(eq(agentRunTable.id, agentRunId))
  return actor
}
