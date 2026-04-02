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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {stat.label}
          </span>
          <span className="text-sm font-medium text-slate-900">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
    {details && details.length > 0 && (
      <details className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-6 py-3 text-sm text-slate-500">
          Details
        </summary>
        <div className="flex flex-col gap-4 border-t border-slate-100 px-6 pb-4 pt-4">
          {details.map((group) => (
            <dl
              key={group.map((s) => s.label).join()}
              className="grid gap-4 md:grid-cols-2"
            >
              {group.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </dt>
                  <dd className="text-sm text-slate-900">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      </details>
    )}
  </div>
)
