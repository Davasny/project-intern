import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { db } from "@/lib/db"

type UpdateAgentRunMetricsParams = {
  agentRunId: string
  costUsd: number | null
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number | null
  toolCallCount: number | null
}

export const updateAgentRunMetrics = async ({
  agentRunId,
  costUsd,
  inputTokens,
  outputTokens,
  latencyMs,
  toolCallCount,
}: UpdateAgentRunMetricsParams) => {
  const result = await db
    .update(agentRunTable)
    .set({
      // Set both column variants for compatibility
      inputTokens: inputTokens ?? null,
      tokenInput: inputTokens ?? null,
      outputTokens: outputTokens ?? null,
      tokenOutput: outputTokens ?? null,
      latencyMs: latencyMs ?? null,
      toolCallCount: toolCallCount ?? 0,
      estimatedCostUsd: costUsd != null ? String(costUsd) : null,
      costUsd: costUsd != null ? String(costUsd) : null,
    })
    .where(eq(agentRunTable.id, agentRunId))
    .returning()

  return result[0] ?? null
}
