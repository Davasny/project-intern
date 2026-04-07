"use client"

import { TableCell, TableRow } from "@/components/ui/table"
import { ExecutionMatrixCell } from "@/features/execution/components/execution-matrix-cell"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

type ExecutionMatrixRecordRowProps = {
  organizationSlug: string
  projectSlug: string
  record: {
    id: string
    name: string
  }
  recordCells:
    | Map<
        string,
        {
          latestAgentRun: {
            id: string
            state: AgentRunState
          } | null
          state: TaskRecordState
        }
      >
    | null
  tasks: Array<{
    id: string
    title: string
  }>
}

export const ExecutionMatrixRecordRow = ({
  organizationSlug,
  projectSlug,
  record,
  recordCells,
  tasks,
}: ExecutionMatrixRecordRowProps) => (
  <TableRow>
    <TableCell className="sticky left-0 z-10 min-w-56 bg-card font-medium text-foreground">
      {record.name}
    </TableCell>
    {tasks.map((task) => (
      <TableCell className="min-w-40" key={`${record.id}-${task.id}`}>
        <ExecutionMatrixCell
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          taskRecord={recordCells ? (recordCells.get(task.id) ?? null) : null}
        />
      </TableCell>
    ))}
  </TableRow>
)
