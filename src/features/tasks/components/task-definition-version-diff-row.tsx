import { buildInlineLineDiff } from "@/features/tasks/lib/build-inline-line-diff"
import { cn } from "@/lib/utils"

type TaskDefinitionVersionDiffRowProps = {
  collapseUnchanged: boolean
  change: {
    after: string
    before: string
    field: string
    label: string
  }
}

export const TaskDefinitionVersionDiffRow = ({
  collapseUnchanged,
  change,
}: TaskDefinitionVersionDiffRowProps) => {
  const rows = buildInlineLineDiff({ after: change.after, before: change.before })
  const visibleRows = collapseUnchanged
    ? rows.filter((row) => row.type !== "unchanged")
    : rows

  return (
    <div className="overflow-hidden rounded-xl border bg-background font-mono text-sm">
      {visibleRows.map((row, index) => (
        <div
          className={cn(
            "grid grid-cols-[2rem_1fr] gap-3 px-3 py-1 whitespace-pre-wrap",
            row.type === "added"
              ? "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
              : null,
            row.type === "removed"
              ? "bg-red-500/10 text-red-950 dark:text-red-100"
              : null,
            row.type === "unchanged" ? "text-muted-foreground" : null,
          )}
          key={`${change.field}-${row.type}-${String(index)}`}
        >
          <span className="select-none text-right text-muted-foreground">
            {row.type === "added" ? "+" : row.type === "removed" ? "-" : " "}
          </span>
          <span className="break-words">{row.line}</span>
        </div>
      ))}
    </div>
  )
}
