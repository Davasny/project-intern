import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"

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
  return actor.send("run", {
    inputTokens: tokenInput,
    latencyMs,
    model,
    provider,
    sessionReference,
    tokenInput,
    toolActivitySummary,
    toolCallCount: getToolCallCount(toolActivitySummary),
    toolSummary: toolActivitySummary,
  })
}
