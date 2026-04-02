import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"
import { db } from "@/lib/db"

type MarkAgentRunRunningParams = {
  agentRunId: string
  latencyMs: number | null
  model: string
  provider: string
  sessionReference: string | null
  tokenInput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const markAgentRunRunning = async ({
  agentRunId,
  latencyMs,
  model,
  provider,
  sessionReference,
  tokenInput,
  toolActivitySummary,
}: MarkAgentRunRunningParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("run")
  await db
    .update(agentRunTable)
    .set({
      inputTokens: tokenInput,
      latencyMs,
      model,
      provider,
      sessionReference,
      state: "running",
      tokenInput,
      toolActivitySummary,
      toolCallCount: getToolCallCount(toolActivitySummary),
      toolSummary: toolActivitySummary,
    })
    .where(eq(agentRunTable.id, agentRunId))
  return actor
}
