type StatsBarItem = {
  label: string
  value: string | number
}

type StatsBarProps = {
  stats: StatsBarItem[]
  details: StatsBarItem[][]
  className?: string
}

export const StatsBar = ({ stats, details, className }: StatsBarProps) => (
  <div className={className}>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-border bg-card px-6 py-4 shadow-sm">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {stat.label}
          </span>
          <span className="text-foreground text-sm font-medium">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
    {details && details.length > 0 && (
      <details className="mt-3 rounded-2xl border border-border bg-card shadow-sm">
        <summary className="text-muted-foreground cursor-pointer px-6 py-3 text-sm">
          Details
        </summary>
        <div className="flex flex-col gap-4 border-t border-border px-6 pb-4 pt-4">
          {details.map((group) => (
            <dl
              key={group.map((s) => s.label).join()}
              className="grid gap-4 md:grid-cols-2"
            >
              {group.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {stat.label}
                  </dt>
                  <dd className="text-foreground text-sm">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      </details>
    )}
  </div>
)
