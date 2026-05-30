import { DataTable } from "@/components/ui/data-table/data-table"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExecutionMatrixHeaderCell } from "@/features/execution/components/execution-matrix-header-cell"
import { ExecutionMatrixRecordRow } from "@/features/execution/components/execution-matrix-record-row"
import type { ExecutionTaskRecordCell } from "@/features/execution/lib/build-execution-matrix"

type ExecutionMatrixSectionProps = {
  debugControlsEnabled: boolean
  isAutopickEnabled: boolean
  matrix: {
    records: Array<{
      id: string
      name: string
    }>
    taskRecordsByRecordId: Map<string, Map<string, ExecutionTaskRecordCell>>
    tasks: Array<{
      id: string
      sortOrder: number
      title: string
    }>
  }
  organizationSlug: string
  projectSlug: string
}

export const ExecutionMatrixSection = ({
  debugControlsEnabled,
  isAutopickEnabled,
  matrix,
  organizationSlug,
  projectSlug,
}: ExecutionMatrixSectionProps) => (
  <DataTable>
    <TableHead>
      <TableRow>
        <TableHeader className="sticky left-0 z-20 min-w-56 bg-muted">
          Record
        </TableHeader>
        {matrix.tasks.map((task) => (
          <ExecutionMatrixHeaderCell
            key={task.id}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            task={task}
          />
        ))}
      </TableRow>
    </TableHead>
    <TableBody>
      {matrix.records.length > 0 ? (
        matrix.records.map((record) => (
          <ExecutionMatrixRecordRow
            debugControlsEnabled={debugControlsEnabled}
            isAutopickEnabled={isAutopickEnabled}
            key={record.id}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            record={record}
            recordCells={matrix.taskRecordsByRecordId.get(record.id) ?? null}
            tasks={matrix.tasks}
          />
        ))
      ) : (
        <TableRow>
          <TableCell
            className="text-sm text-muted-foreground"
            colSpan={Math.max(matrix.tasks.length + 1, 2)}
          >
            No task-record executions yet.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </DataTable>
)
