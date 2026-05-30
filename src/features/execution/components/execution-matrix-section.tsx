import { DataTable } from "@/components/ui/data-table/data-table"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExecutionMatrixAddRecordRow } from "@/features/execution/components/execution-matrix-add-record-row"
import { ExecutionMatrixAddTaskHeader } from "@/features/execution/components/execution-matrix-add-task-header"
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
  onAddRecord: () => void
  onAddTask: () => void
  organizationSlug: string
  projectSlug: string
}

export const ExecutionMatrixSection = ({
  debugControlsEnabled,
  isAutopickEnabled,
  matrix,
  onAddRecord,
  onAddTask,
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
        <ExecutionMatrixAddTaskHeader onAddTask={onAddTask} />
      </TableRow>
    </TableHead>
    <TableBody>
      {matrix.records.map((record) => (
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
      ))}
      <ExecutionMatrixAddRecordRow
        onAddRecord={onAddRecord}
        taskCount={matrix.tasks.length}
      />
    </TableBody>
  </DataTable>
)
