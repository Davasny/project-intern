import type { ReactNode } from "react"

type ProgressMetricGridProps = {
  children: ReactNode
}

export const ProgressMetricGrid = ({ children }: ProgressMetricGridProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>
)
