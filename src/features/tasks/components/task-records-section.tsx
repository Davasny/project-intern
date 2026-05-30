import { DataTable } from "@/components/ui/data-table/data-table"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { TaskRecordRow } from "@/features/tasks/components/task-record-row"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

type TaskRecordsSectionProps = {
  taskId: string
  taskRecords: {
    errorCode: string | null
    id: string
    lastTransitionAt: Date
    latestAgentRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      selectedModel: string | null
      selectedTemperature: number | null
      state: AgentRunState
    } | null
    recordId: string
    recordName: string
    state: TaskRecordState
  }[]
  taskTitle: string
}

export const TaskRecordsSection = ({
  taskId,
  taskRecords,
  taskTitle,
}: TaskRecordsSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Records</h2>
      <p className="text-sm text-muted-foreground">
        Per-record task state and latest agent run.
      </p>
    </SectionCardHeader>
    <SectionCardContent>
      <DataTable ariaLabel="Task records">
        <TableHead>
          <TableRow>
            <TableHeader>Record</TableHeader>
            <TableHeader>Task state</TableHeader>
            <TableHeader>Latest run</TableHeader>
            <TableHeader>Last transition</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {taskRecords.map((taskRecord) => (
            <TaskRecordRow
              key={taskRecord.id}
              taskId={taskId}
              taskRecord={taskRecord}
              taskTitle={taskTitle}
            />
          ))}
        </TableBody>
      </DataTable>
    </SectionCardContent>
  </SectionCard>
)
