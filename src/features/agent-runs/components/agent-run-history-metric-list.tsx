import type { AgentRunHistoryEventMetrics } from "@/features/agent-runs/lib/agent-run-history-event"

type AgentRunHistoryMetricListProps = {
  metrics: AgentRunHistoryEventMetrics
}

const formatCost = (cost: number) => `$${cost.toFixed(4)}`

const formatTokenCount = (tokens: number) => tokens.toLocaleString()

export const AgentRunHistoryMetricList = ({
  metrics,
}: AgentRunHistoryMetricListProps) => {
  const totalTokens = metrics.tokens
    ? metrics.tokens.input + metrics.tokens.output
    : null

  if (totalTokens === null && metrics.cost === null) {
    return null
  }

  return (
    <div className="flex flex-row flex-wrap items-center justify-end gap-1.5 text-xs text-muted-foreground">
      {totalTokens !== null ? (
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5">
          {formatTokenCount(totalTokens)} tok
        </span>
      ) : null}
      {metrics.cost !== null ? (
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5">
          {formatCost(metrics.cost)}
        </span>
      ) : null}
    </div>
  )
}
