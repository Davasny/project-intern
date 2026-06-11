type TaskDefinitionVersionChangePreviewProps = {
  change: {
    after: string
    before: string
    field: string
    label: string
  }
}

export const TaskDefinitionVersionChangePreview = ({
  change,
}: TaskDefinitionVersionChangePreviewProps) => (
  <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 text-sm md:grid-cols-[9rem_1fr_1fr]">
    <div className="font-medium text-foreground">{change.label}</div>
    <div className="min-w-0 rounded-lg bg-background p-2 text-muted-foreground">
      <span className="line-clamp-3 break-words">{change.before}</span>
    </div>
    <div className="min-w-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-foreground">
      <span className="line-clamp-3 break-words">{change.after}</span>
    </div>
  </div>
)
