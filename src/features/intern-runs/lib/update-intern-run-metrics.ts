import { eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { db } from "@/lib/db"

type UpdateInternRunMetricsParams = {
  internRunId: string
  costUsd: number | null
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number | null
  toolCallCount: number | null
}

export const updateInternRunMetrics = async ({
  internRunId,
  costUsd,
  inputTokens,
  outputTokens,
  latencyMs,
  toolCallCount,
}: UpdateInternRunMetricsParams) => {
  const result = await db
    .update(internRunTable)
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
    .where(eq(internRunTable.id, internRunId))
    .returning()

  return result[0] ?? null
}
