"use client"

import Link from "next/link"
import { TableCell, TableRow } from "@/components/ui/table"
import { ExecutionMatrixCell } from "@/features/execution/components/execution-matrix-cell"
import type { ExecutionTaskRecordCell } from "@/features/execution/lib/build-execution-matrix"

type ExecutionMatrixRecordRowProps = {
  debugControlsEnabled: boolean
  isAutopickEnabled: boolean
  organizationSlug: string
  projectSlug: string
  record: {
    id: string
    name: string
  }
  recordCells:
    | Map<
        string,
        ExecutionTaskRecordCell
      >
    | null
  tasks: Array<{
    id: string
    title: string
  }>
}

export const ExecutionMatrixRecordRow = ({
  debugControlsEnabled,
  isAutopickEnabled,
  organizationSlug,
  projectSlug,
  record,
  recordCells,
  tasks,
}: ExecutionMatrixRecordRowProps) => (
  <TableRow>
    <TableCell className="sticky left-0 z-10 min-w-56 bg-card font-medium text-foreground">
      <Link
        className="text-foreground hover:text-muted-foreground"
        href={`/app/${organizationSlug}/${projectSlug}/records/${record.id}`}
      >
        {record.name}
      </Link>
    </TableCell>
    {tasks.map((task) => (
      <TableCell className="min-w-40" key={`${record.id}-${task.id}`}>
        <ExecutionMatrixCell
          debugControlsEnabled={debugControlsEnabled}
          isAutopickEnabled={isAutopickEnabled}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          taskRecord={recordCells ? (recordCells.get(task.id) ?? null) : null}
        />
      </TableCell>
    ))}
    <TableCell className="min-w-40 border-l-2 border-dashed border-border" />
  </TableRow>
)
