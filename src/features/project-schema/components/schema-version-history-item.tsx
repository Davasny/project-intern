import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"

type SchemaVersionHistoryItemProps = {
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
  SchemaVersionHistoryItemProps["version"]["migration"]["status"],
  "danger" | "info" | "muted" | "success" | "warning"
>

export const SchemaVersionHistoryItem = ({
  canCompare,
  isActive,
  onCompare,
  taskHrefBase,
  version,
}: SchemaVersionHistoryItemProps) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          Version {version.version}
        </h3>
        <p className="text-xs text-muted-foreground">
          {version.createdAt.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">{version.id}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <StatusBadge
            label={version.migration.status.replaceAll("_", " ")}
            tone={migrationToneByStatus[version.migration.status]}
          />
          <span className="text-xs text-muted-foreground">
            affected {version.migration.affectedRecordCount}
          </span>
          <span className="text-xs text-muted-foreground">
            pending {version.migration.pendingRecordCount}
          </span>
        </div>
        {version.migration.taskId ? (
          <Link
            className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
            href={`${taskHrefBase}/${version.migration.taskId}`}
          >
            {version.migration.taskTitle ?? "Open migration task"}
          </Link>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {isActive ? (
          <span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
            active
          </span>
        ) : null}
        <Button
          disabled={!canCompare}
          onClick={onCompare}
          type="button"
          variant="secondary"
        >
          Compare
        </Button>
      </div>
    </div>
  </Card>
)
