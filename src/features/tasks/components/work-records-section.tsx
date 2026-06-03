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
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import { WorkRecordRow } from "@/features/tasks/components/work-record-row"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"

type WorkRecordsSectionProps = {
  taskId: string
  workRecords: {
    errorCode: string | null
    id: string
    lastTransitionAt: Date
    latestInternRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      selectedModel: string | null
      selectedTemperature: number | null
      state: InternRunState
      statusTooltipText: string | null
    } | null
    recordId: string
    recordName: string
    state: WorkRecordState
  }[]
  taskTitle: string
}

export const WorkRecordsSection = ({
  taskId,
  workRecords,
  taskTitle,
}: WorkRecordsSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Records</h2>
      <p className="text-sm text-muted-foreground">
        Per-record task state and latest intern run.
      </p>
    </SectionCardHeader>
    <SectionCardContent>
      <DataTable ariaLabel="Work records">
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
          {workRecords.map((workRecord) => (
            <WorkRecordRow
              key={workRecord.id}
              taskId={taskId}
              workRecord={workRecord}
              taskTitle={taskTitle}
            />
          ))}
        </TableBody>
      </DataTable>
    </SectionCardContent>
  </SectionCard>
)
