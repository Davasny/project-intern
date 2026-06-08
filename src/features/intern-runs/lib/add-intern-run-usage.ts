import type { InternRunUsageSummary } from "@/features/intern-runs/lib/intern-run-usage-summary"

type AddInternRunUsageParams = {
  summary: InternRunUsageSummary
  costUsd: string | null
  estimatedCostUsd: string | null
  durationMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  cachedInputTokens: number | null
  cacheWriteTokens: number | null
  tokenInput: number | null
  tokenOutput: number | null
}

export const addInternRunUsage = ({
  summary,
  costUsd,
  estimatedCostUsd,
  durationMs,
  inputTokens,
  outputTokens,
  cachedInputTokens,
  cacheWriteTokens,
  tokenInput,
  tokenOutput,
}: AddInternRunUsageParams) => {
  const resolvedCostUsd = costUsd ?? estimatedCostUsd
  const resolvedInputTokens = inputTokens ?? tokenInput ?? 0
  const resolvedOutputTokens = outputTokens ?? tokenOutput ?? 0
  const resolvedCachedInputTokens = cachedInputTokens ?? 0
  const resolvedCacheWriteTokens = cacheWriteTokens ?? 0

  summary.totalCostUsd += resolvedCostUsd !== null ? Number(resolvedCostUsd) : 0
  summary.totalDurationMs += durationMs ?? 0
  summary.totalInputTokens += resolvedInputTokens
  summary.totalOutputTokens += resolvedOutputTokens
  summary.totalCachedInputTokens += resolvedCachedInputTokens
  summary.totalCacheWriteTokens += resolvedCacheWriteTokens
  summary.totalTokens +=
    resolvedInputTokens + resolvedOutputTokens + resolvedCachedInputTokens
  summary.runCount += 1
}
