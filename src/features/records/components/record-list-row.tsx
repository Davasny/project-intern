import Link from "next/link"
import { RecordStatusBadge } from "@/components/ui/status-badge/record-status-badge"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"

type RecordListRowProps = {
  organizationSlug: string
  projectSlug: string
  record: {
    activeRun: {
      state:
        | "aborted"
        | "booting"
        | "completed"
        | "created"
        | "failed"
        | "persisting_outputs"
        | "running"
    } | null
    id: string
    name: string
    progress: {
      completedCount: number
      failedCount: number
      inProgressCount: number
      totalCount: number
      waitingCount: number
    }
    relationSummary: {
      activeCount: number
    }
    schemaVersion: number
    state: "active" | "archived" | "error" | "processing"
    updatedAt: Date
    version: number
  }
}

export const RecordListRow = ({
  organizationSlug,
  projectSlug,
  record,
}: RecordListRowProps) => (
  <TableRow>
    <TableCell>
      <div className="flex flex-col gap-1">
        <Link
          className="font-medium text-slate-900 hover:text-slate-600"
          href={`/app/${organizationSlug}/${projectSlug}/records/${record.id}`}
        >
          {record.name}
        </Link>
        <span className="text-xs text-slate-500">
          Schema v{record.schemaVersion} · Record v{record.version}
        </span>
      </div>
    </TableCell>
    <TableCell>
      <RecordStatusBadge state={record.state} />
    </TableCell>
    <TableCell>
      {record.progress.completedCount}/{record.progress.totalCount} completed
    </TableCell>
    <TableCell>{record.progress.inProgressCount} active</TableCell>
    <TableCell>{record.progress.failedCount} failed</TableCell>
    <TableCell>{record.progress.waitingCount} waiting</TableCell>
    <TableCell>
      {record.activeRun ? (
        <RunStatusBadge state={record.activeRun.state} />
      ) : (
        "—"
      )}
    </TableCell>
    <TableCell>{record.relationSummary.activeCount} relations</TableCell>
    <TableCell>{record.updatedAt.toLocaleString()}</TableCell>
  </TableRow>
)
