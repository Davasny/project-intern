import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"
import { db } from "@/lib/db"

type PersistAgentRunOutputsParams = {
  agentRunId: string
  resultPayload: Record<string, unknown> | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const persistAgentRunOutputs = async ({
  agentRunId,
  resultPayload,
  tokenOutput,
  toolActivitySummary,
}: PersistAgentRunOutputsParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("persist")
  await db
    .update(agentRunTable)
    .set({
      outputTokens: tokenOutput,
      resultPayload,
      tokenOutput,
      toolActivitySummary,
      toolCallCount: getToolCallCount(toolActivitySummary),
      toolSummary: toolActivitySummary,
    })
    .where(eq(agentRunTable.id, agentRunId))
  return actor
}
