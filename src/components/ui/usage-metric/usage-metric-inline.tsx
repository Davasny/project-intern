import { formatCostUsd } from "@/components/ui/usage-metric/format-cost-usd"
import { formatTokenCount } from "@/components/ui/usage-metric/format-token-count"

type UsageMetricInlineProps = {
  totalCostUsd: number
  totalTokens: number
}

export const UsageMetricInline = ({
  totalCostUsd,
  totalTokens,
}: UsageMetricInlineProps) => (
  <div className="flex flex-col gap-1 text-sm tabular-nums">
    <span className="font-medium text-foreground">
      {formatCostUsd(totalCostUsd)}
    </span>
    <span className="text-xs text-muted-foreground">
      {formatTokenCount(totalTokens)} tokens
    </span>
  </div>
)
