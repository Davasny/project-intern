import { ProgressStrip } from "@/components/ui/progress-strip/progress-strip"
import { cn } from "@/lib/utils"

type ExecutionSummaryStripProps = {
  summary: {
    activeCount: number
    failedCount: number
    retriedCount: number
    skippedCount: number
    waitingCount: number
  }
  isAutopickEnabled: boolean
}

export const ExecutionSummaryStrip = ({
  summary,
  isAutopickEnabled,
}: ExecutionSummaryStripProps) => (
  <ProgressStrip
    items={[
      { label: "Waiting", value: summary.waitingCount },
      { label: "Active", value: summary.activeCount },
      { label: "Failed", value: summary.failedCount },
      { label: "Skipped", value: summary.skippedCount },
      { label: "Retried", value: summary.retriedCount },
    ]}
  >
    <div className="flex min-w-28 flex-1 flex-row items-center justify-between gap-3 border-border px-4 py-3 not-last:border-r">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Autopick
      </span>
      <span
        className={cn(
          "text-base font-semibold tabular-nums",
          isAutopickEnabled ? "text-green-600" : "text-muted-foreground",
        )}
      >
        {isAutopickEnabled ? "ON" : "OFF"}
      </span>
    </div>
  </ProgressStrip>
)
