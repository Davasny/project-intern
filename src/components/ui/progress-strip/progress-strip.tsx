import type { ReactNode } from "react"

type ProgressStripItem = {
  label: string
  value: number
}

type ProgressStripProps = {
  items: ProgressStripItem[]
  children?: ReactNode
}

export const ProgressStrip = ({ items, children }: ProgressStripProps) => (
  <div className="flex flex-row flex-wrap rounded-xl border border-border bg-card">
    {items.map((item) => (
      <div
        className="flex min-w-28 flex-1 flex-row items-center justify-between gap-3 border-border px-4 py-3 not-last:border-r"
        key={item.label}
      >
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {item.label}
        </span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {item.value}
        </span>
      </div>
    ))}
    {children}
  </div>
)
