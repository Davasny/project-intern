"use client"

import Link from "next/link"
import { RecordStatusBadge } from "@/components/ui/status-badge/record-status-badge"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"
import { RecordContextValueCell } from "@/features/records/components/record-context-value-cell"
import { useProjectScope } from "@/features/projects/context/project-scope-context"

type RecordListRowProps = {
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
    context: Record<string, unknown>
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
  contextColumns: ProjectSchemaField[]
  showContextValues: boolean
}

export const RecordListRow = ({
  contextColumns,
  record,
  showContextValues,
}: RecordListRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Link
            className="font-medium text-foreground hover:text-muted-foreground"
            href={`/app/${organizationSlug}/${projectSlug}/records/${record.id}`}
          >
            {record.name}
          </Link>
          <span className="text-xs text-muted-foreground">
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
      {showContextValues
        ? contextColumns.map((field) => (
            <RecordContextValueCell
              key={`${record.id}-${field.key}`}
              value={record.context[field.key]}
            />
          ))
        : null}
      <TableCell>{record.updatedAt.toLocaleString()}</TableCell>
    </TableRow>
  )
}
