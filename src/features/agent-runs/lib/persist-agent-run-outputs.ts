import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"

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
  return actor.send("persist", {
    outputTokens: tokenOutput,
    resultPayload,
    tokenOutput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}
