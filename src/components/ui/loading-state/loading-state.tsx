type LoadingStateProps = {
  label: string
}

export const LoadingState = ({ label }: LoadingStateProps) => (
  <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
    {label}
  </div>
)
