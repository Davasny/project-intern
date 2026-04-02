import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { cn } from "@/utils/cn"

type SchemaVersionTimelineItemProps = {
  canCompare: boolean
  isActive: boolean
  onCompare: () => void
  taskHrefBase: string
  version: {
    createdAt: Date
    id: string
    migration: {
      affectedRecordCount: number
      pendingRecordCount: number
      status: "completed" | "failed" | "in_progress" | "pending" | "queued"
      taskId: string | null
      taskTitle: string | null
    }
    version: number
  }
}

const migrationToneByStatus = {
  completed: "success",
  failed: "danger",
  in_progress: "info",
  pending: "warning",
  queued: "muted",
} satisfies Record<
  SchemaVersionTimelineItemProps["version"]["migration"]["status"],
  "danger" | "info" | "muted" | "success" | "warning"
>

export const SchemaVersionTimelineItem = ({
  canCompare,
  isActive,
  onCompare,
  taskHrefBase,
  version,
}: SchemaVersionTimelineItemProps) => (
  <div className="flex items-center gap-4 py-2">
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-900">
          Version {version.version}
        </span>
        {isActive ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            active
          </span>
        ) : null}
        <StatusBadge
          label={version.migration.status.replaceAll("_", " ")}
          tone={migrationToneByStatus[version.migration.status]}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{version.createdAt.toLocaleDateString()}</span>
        <span>·</span>
        <span>{version.migration.affectedRecordCount} affected</span>
        {version.migration.pendingRecordCount > 0 ? (
          <>
            <span>·</span>
            <span>{version.migration.pendingRecordCount} pending</span>
          </>
        ) : null}
        {version.migration.taskId ? (
          <>
            <span>·</span>
            <Link
              className="font-medium text-slate-700 underline-offset-2 hover:underline"
              href={`${taskHrefBase}/${version.migration.taskId}`}
            >
              {version.migration.taskTitle ?? "View task"}
            </Link>
          </>
        ) : null}
      </div>
    </div>
    {canCompare ? (
      <Button onClick={onCompare} size="sm" type="button" variant="ghost">
        Compare
      </Button>
    ) : null}
  </div>
)
