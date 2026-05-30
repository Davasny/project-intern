import { ProgressStrip } from "@/components/ui/progress-strip/progress-strip"

type ExecutionSummaryStripProps = {
  summary: {
    activeCount: number
    failedCount: number
    retriedCount: number
    waitingCount: number
  }
}

export const ExecutionSummaryStrip = ({
  summary,
}: ExecutionSummaryStripProps) => (
  <ProgressStrip
    items={[
      { label: "Waiting", value: summary.waitingCount },
      { label: "Active", value: summary.activeCount },
      { label: "Failed", value: summary.failedCount },
      { label: "Retried", value: summary.retriedCount },
    ]}
  />
)
