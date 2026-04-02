type ActivityTimelineItemProps = {
  description: string
  label: string
  timestamp: string
}

export const ActivityTimelineItem = ({
  description,
  label,
  timestamp,
}: ActivityTimelineItemProps) => (
  <li className="flex flex-col gap-1 rounded-2xl border border-border bg-muted/30 p-4">
    <div className="flex items-center justify-between gap-3">
      <span className="text-foreground text-sm font-medium">{label}</span>
      <span className="text-muted-foreground text-xs">{timestamp}</span>
    </div>
    <p className="text-muted-foreground text-sm">{description}</p>
  </li>
)
