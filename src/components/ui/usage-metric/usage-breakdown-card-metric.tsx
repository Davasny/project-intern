import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type UsageBreakdownCardMetricProps = HTMLAttributes<HTMLDivElement> & {
  label: string
  value: string
}

export const UsageBreakdownCardMetric = ({
  className,
  label,
  value,
  ...props
}: UsageBreakdownCardMetricProps) => (
  <div
    className={cn(
      "flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2",
      className,
    )}
    {...props}
  >
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {label}
    </span>
    <span className="font-semibold tabular-nums text-foreground">{value}</span>
  </div>
)
