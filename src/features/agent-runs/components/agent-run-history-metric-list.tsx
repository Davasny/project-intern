import type { AgentRunHistoryEventMetrics } from "@/features/agent-runs/lib/agent-run-history-event"
import { cn } from "@/lib/utils"

type AgentRunHistoryMetricListProps = {
  alignment: "end" | "start"
  metrics: AgentRunHistoryEventMetrics
}

const formatCost = (cost: number) => `$${cost.toFixed(4)}`

const formatTokenCount = (tokens: number) => tokens.toLocaleString()

export const AgentRunHistoryMetricList = ({
  alignment,
  metrics,
}: AgentRunHistoryMetricListProps) => {
  const totalTokens = metrics.tokens
    ? metrics.tokens.input + metrics.tokens.output
    : null

  if (totalTokens === null && metrics.cost === null) {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-1.5 text-xs text-muted-foreground",
        alignment === "end" ? "justify-end" : "justify-start",
      )}
    >
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
