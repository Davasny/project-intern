export type InternRunUsageSummary = {
  totalCostUsd: number
  totalDurationMs: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCachedInputTokens: number
  totalCacheWriteTokens: number
  totalTokens: number
  runCount: number
}

export const emptyInternRunUsageSummary = (): InternRunUsageSummary => ({
  totalCostUsd: 0,
  totalDurationMs: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCachedInputTokens: 0,
  totalCacheWriteTokens: 0,
  totalTokens: 0,
  runCount: 0,
})
