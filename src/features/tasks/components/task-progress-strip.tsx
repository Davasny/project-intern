import { ProgressStrip } from "@/components/ui/progress-strip/progress-strip"

type TaskProgressStripProps = {
  activeCount: number
  completedCount: number
  failedCount: number
  skippedCount: number
  waitingCount: number
}

const progressItems: {
  key: keyof TaskProgressStripProps
  label: string
}[] = [
  { key: "waitingCount", label: "Waiting" },
  { key: "activeCount", label: "Active" },
  { key: "completedCount", label: "Completed" },
  { key: "failedCount", label: "Failed" },
  { key: "skippedCount", label: "Skipped" },
]

export const TaskProgressStrip = (props: TaskProgressStripProps) => (
  <ProgressStrip
    items={progressItems.map((item) => ({
      label: item.label,
      value: props[item.key],
    }))}
  />
)
