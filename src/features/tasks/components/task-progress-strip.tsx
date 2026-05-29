type TaskProgressStripProps = {
  activeCount: number
  completedCount: number
  failedCount: number
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
]

export const TaskProgressStrip = (props: TaskProgressStripProps) => (
  <div className="flex flex-row flex-wrap rounded-xl border border-border bg-card">
    {progressItems.map((item) => (
      <div
        className="flex min-w-28 flex-1 flex-row items-center justify-between gap-3 border-border px-4 py-3 not-last:border-r"
        key={item.key}
      >
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {item.label}
        </span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {props[item.key]}
        </span>
      </div>
    ))}
  </div>
)
