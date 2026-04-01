type LoadingStateProps = {
  label: string
}

export const LoadingState = ({ label }: LoadingStateProps) => (
  <div className="rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-sm text-slate-500">
    {label}
  </div>
)
