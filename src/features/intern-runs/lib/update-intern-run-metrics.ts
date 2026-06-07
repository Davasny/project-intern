import { eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { calculateInternRunDurationMs } from "@/features/intern-runs/lib/calculate-intern-run-duration-ms"
import { db } from "@/lib/db"

type UpdateInternRunMetricsParams = {
  internRunId: string
  costUsd: number | null
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number | null
  toolCallCount: number | null
}

const maxNullableNumber = (left: number | null, right: number | null) => {
  if (left === null) {
    return right
  }

  if (right === null) {
    return left
  }

  return Math.max(left, right)
}

const maxNullableNumericString = (
  left: string | null,
  right: number | null,
) => {
  if (left === null) {
    return right != null ? String(right) : null
  }

  if (right === null) {
    return left
  }

  return String(Math.max(Number(left), right))
}

export const updateInternRunMetrics = async ({
  internRunId,
  costUsd,
  inputTokens,
  outputTokens,
  latencyMs,
  toolCallCount,
}: UpdateInternRunMetricsParams) => {
  const rows = await db
    .select({
      costUsd: internRunTable.costUsd,
      estimatedCostUsd: internRunTable.estimatedCostUsd,
      finishedAt: internRunTable.finishedAt,
      inputTokens: internRunTable.inputTokens,
      latencyMs: internRunTable.latencyMs,
      outputTokens: internRunTable.outputTokens,
      startedAt: internRunTable.startedAt,
      tokenInput: internRunTable.tokenInput,
      tokenOutput: internRunTable.tokenOutput,
      toolCallCount: internRunTable.toolCallCount,
    })
    .from(internRunTable)
    .where(eq(internRunTable.id, internRunId))
    .limit(1)

  const internRun = rows[0]

  if (!internRun) {
    return null
  }

  const persistedDurationMs = calculateInternRunDurationMs({
    finishedAt: internRun.finishedAt,
    latencyMs: internRun.latencyMs,
    startedAt: internRun.startedAt,
  })
  const nextLatencyMs = maxNullableNumber(latencyMs, persistedDurationMs)
  const nextCostUsd = maxNullableNumericString(internRun.costUsd, costUsd)
  const nextEstimatedCostUsd = maxNullableNumericString(
    internRun.estimatedCostUsd,
    costUsd,
  )
  const nextInputTokens = maxNullableNumber(inputTokens, internRun.inputTokens)
  const nextOutputTokens = maxNullableNumber(
    outputTokens,
    internRun.outputTokens,
  )
  const nextToolCallCount = maxNullableNumber(
    toolCallCount,
    internRun.toolCallCount,
  )

  const result = await db
    .update(internRunTable)
    .set({
      inputTokens: nextInputTokens,
      tokenInput: maxNullableNumber(inputTokens, internRun.tokenInput),
      outputTokens: nextOutputTokens,
      tokenOutput: maxNullableNumber(outputTokens, internRun.tokenOutput),
      latencyMs: nextLatencyMs,
      toolCallCount: nextToolCallCount ?? 0,
      estimatedCostUsd: nextEstimatedCostUsd,
      costUsd: nextCostUsd,
    })
    .where(eq(internRunTable.id, internRunId))
    .returning()

  return result[0] ?? null
}
