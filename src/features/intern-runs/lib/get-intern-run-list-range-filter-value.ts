import type { InternRunListRangeFilterColumnId } from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type { InternRunListItem } from "@/features/intern-runs/lib/intern-run-list-item"

export const getInternRunListRangeFilterValue = ({
  columnId,
  run,
}: {
  columnId: InternRunListRangeFilterColumnId
  run: InternRunListItem
}) => {
  if (columnId === "temperature") {
    return run.selectedTemperature
  }

  if (columnId === "attempt") {
    return run.attemptNumber
  }

  if (columnId === "duration") {
    return run.durationMs !== null ? run.durationMs / 1000 : null
  }

  if (columnId === "toolCalls") {
    return run.taskCallCount
  }

  if (columnId === "tokensIn") {
    return run.inputTokens ?? run.tokenInput
  }

  if (columnId === "cachedTokens") {
    return run.cachedInputTokens
  }

  if (columnId === "tokensOut") {
    return run.outputTokens ?? run.tokenOutput
  }

  if (run.costUsd !== null) {
    return Number(run.costUsd)
  }

  return run.estimatedCostUsd !== null ? Number(run.estimatedCostUsd) : null
}
