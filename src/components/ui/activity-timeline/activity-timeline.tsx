import type { ReactNode } from "react"

type ActivityTimelineProps = {
  children: ReactNode
}

export const ActivityTimeline = ({ children }: ActivityTimelineProps) => (
  <ol className="flex flex-col gap-4">{children}</ol>
)
