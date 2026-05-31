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
import { RecordLinkedTaskRow } from "@/features/records/components/record-linked-task-row"

type LinkedTask = Parameters<typeof RecordLinkedTaskRow>[0]["task"]

type RecordLinkedTasksSectionProps = {
  nextWaitingSortOrder: number | null
  recordId: string
  tasks: LinkedTask[]
}

export const RecordLinkedTasksSection = ({
  nextWaitingSortOrder,
  recordId,
  tasks,
}: RecordLinkedTasksSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Linked tasks</h2>
    </SectionCardHeader>
    <SectionCardContent>
      <DataTable ariaLabel="Linked tasks">
        <TableHead>
          <TableRow>
            <TableHeader>Task</TableHeader>
            <TableHeader>Work record</TableHeader>
            <TableHeader>Latest run</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((task) => (
              <RecordLinkedTaskRow
                key={task.workRecordId}
                nextWaitingSortOrder={nextWaitingSortOrder}
                recordId={recordId}
                task={task}
              />
            ))}
        </TableBody>
      </DataTable>
    </SectionCardContent>
  </SectionCard>
)
