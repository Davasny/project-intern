import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { formatCostUsd } from "@/components/ui/usage-metric/format-cost-usd"
import { formatTokenCount } from "@/components/ui/usage-metric/format-token-count"
import { formatDurationMs } from "@/utils/format-duration-ms"

type UsageBreakdownCardProps = {
  averageCostUsd: number | null
  runCount: number
  title: string
  totalCachedInputTokens: number
  totalCacheWriteTokens: number
  totalCostUsd: number
  totalDurationMs: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
}

export const UsageBreakdownCard = ({
  averageCostUsd,
  runCount,
  title,
  totalCachedInputTokens,
  totalCacheWriteTokens,
  totalCostUsd,
  totalDurationMs,
  totalInputTokens,
  totalOutputTokens,
  totalTokens,
}: UsageBreakdownCardProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">
        Costs and tokens across all intern run attempts.
      </p>
    </SectionCardHeader>
    <SectionCardContent>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9">
        <UsageBreakdownMetric label="Total cost" value={formatCostUsd(totalCostUsd)} />
        <UsageBreakdownMetric label="Total time" value={formatDurationMs(totalDurationMs)} />
        <UsageBreakdownMetric label="Total tokens" value={formatTokenCount(totalTokens)} />
        <UsageBreakdownMetric label="Input" value={formatTokenCount(totalInputTokens)} />
        <UsageBreakdownMetric label="Output" value={formatTokenCount(totalOutputTokens)} />
        <UsageBreakdownMetric label="Cached input" value={formatTokenCount(totalCachedInputTokens)} />
        <UsageBreakdownMetric label="Cache write" value={formatTokenCount(totalCacheWriteTokens)} />
        <UsageBreakdownMetric label="Runs" value={formatTokenCount(runCount)} />
        <UsageBreakdownMetric
          label="Average cost"
          value={averageCostUsd === null ? "—" : formatCostUsd(averageCostUsd)}
        />
      </div>
    </SectionCardContent>
  </SectionCard>
)

type UsageBreakdownMetricProps = {
  label: string
  value: string
}

const UsageBreakdownMetric = ({ label, value }: UsageBreakdownMetricProps) => (
  <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {label}
    </span>
    <span className="font-semibold tabular-nums text-foreground">{value}</span>
  </div>
)
