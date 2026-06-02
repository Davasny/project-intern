import type { InternRunListFilterColumnId } from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type { InternRunListItem } from "@/features/intern-runs/lib/intern-run-list-item"
import { formatDurationMs } from "@/utils/format-duration-ms"

export const getInternRunListFilterValue = ({
  columnId,
  run,
}: {
  columnId: InternRunListFilterColumnId
  run: InternRunListItem
}) => {
  if (columnId === "state") {
    return run.state
  }

  if (columnId === "provider") {
    return run.provider ?? "—"
  }

  if (columnId === "model") {
    return run.model ?? "—"
  }

  if (columnId === "temperature") {
    return run.selectedTemperature !== null
      ? run.selectedTemperature.toFixed(1)
      : "—"
  }

  if (columnId === "selectedIntern") {
    return run.selectedIntern ?? "—"
  }

  if (columnId === "task") {
    return run.taskTitle
  }

  if (columnId === "record") {
    return run.recordName
  }

  if (columnId === "attempt") {
    return `#${run.attemptNumber.toLocaleString()}`
  }

  if (columnId === "duration") {
    return formatDurationMs(run.latencyMs)
  }

  if (columnId === "toolCalls") {
    return run.taskCallCount.toLocaleString()
  }

  if (columnId === "tokensIn") {
    if (run.inputTokens !== null) {
      return run.inputTokens.toLocaleString()
    }

    return run.tokenInput !== null ? run.tokenInput.toLocaleString() : "—"
  }

  if (columnId === "tokensOut") {
    if (run.outputTokens !== null) {
      return run.outputTokens.toLocaleString()
    }

    return run.tokenOutput !== null ? run.tokenOutput.toLocaleString() : "—"
  }

  if (columnId === "cost") {
    if (run.costUsd !== null) {
      return `$${Number(run.costUsd).toFixed(4)}`
    }

    return run.estimatedCostUsd !== null
      ? `~$${Number(run.estimatedCostUsd).toFixed(4)}`
      : "—"
  }

  return run.startedAt?.toLocaleString() ?? "—"
}
