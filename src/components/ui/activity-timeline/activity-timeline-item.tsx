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
  <li className="flex flex-col gap-1 rounded-2xl border border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] p-4">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <span className="text-xs text-slate-500">{timestamp}</span>
    </div>
    <p className="text-sm text-slate-500">{description}</p>
  </li>
)
