import Link from "next/link"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { RecordStatusBadge } from "@/components/ui/status-badge/record-status-badge"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"

type RecordListItemProps = {
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
    createdAt: Date
    id: string
    name: string
    progress: {
      completedCount: number
      inProgressCount: number
      totalCount: number
      waitingCount: number
    }
    schemaVersion: number
    state: "active" | "archived" | "error" | "processing"
    updatedAt: Date
    version: number
  }
}

export const RecordListItem = ({
  organizationSlug,
  projectSlug,
  record,
}: RecordListItemProps) => (
  <SectionCard>
    <SectionCardContent className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            className="text-lg font-semibold tracking-tight hover:text-slate-600"
            href={`/app/${organizationSlug}/${projectSlug}/records/${record.id}`}
          >
            {record.name}
          </Link>
          <p className="text-sm text-slate-500">
            Schema version {record.schemaVersion} · Record version{" "}
            {record.version}
          </p>
        </div>
        <RecordStatusBadge state={record.state} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span>Created {record.createdAt.toLocaleString()}</span>
        <span>Updated {record.updatedAt.toLocaleString()}</span>
        <span>
          {record.progress.completedCount}/{record.progress.totalCount} tasks
          completed
        </span>
        <span>{record.progress.inProgressCount} active</span>
        <span>{record.progress.waitingCount} waiting</span>
        {record.activeRun ? (
          <RunStatusBadge state={record.activeRun.state} />
        ) : null}
      </div>
    </SectionCardContent>
  </SectionCard>
)
