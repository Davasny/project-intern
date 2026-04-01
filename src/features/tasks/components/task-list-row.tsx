import Link from "next/link"
import { TaskStatusBadge } from "@/components/ui/status-badge/task-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"

type TaskListRowProps = {
  organizationSlug: string
  projectSlug: string
  task: {
    id: string
    progress: {
      completedCount: number
      failedCount: number
      inProgressCount: number
      totalCount: number
      waitingCount: number
    }
    schemaVersion: number
    sortOrder: number
    summaryState:
      | "cancelled"
      | "completed"
      | "failed"
      | "in_progress"
      | "not_started"
      | "partially_completed"
    title: string
  }
}

export const TaskListRow = ({
  organizationSlug,
  projectSlug,
  task,
}: TaskListRowProps) => (
  <TableRow>
    <TableCell className="font-medium text-slate-900">
      {task.sortOrder}
    </TableCell>
    <TableCell>
      <div className="flex flex-col gap-1">
        <Link
          className="font-medium text-slate-900 hover:text-slate-600"
          href={`/app/${organizationSlug}/${projectSlug}/tasks/${task.id}`}
        >
          {task.title}
        </Link>
        <span className="text-xs text-slate-500">
          Schema v{task.schemaVersion}
        </span>
      </div>
    </TableCell>
    <TableCell>
      <TaskStatusBadge state={task.summaryState} />
    </TableCell>
    <TableCell>
      {task.progress.completedCount}/{task.progress.totalCount} completed
    </TableCell>
    <TableCell>{task.progress.inProgressCount} active</TableCell>
    <TableCell>{task.progress.failedCount} failed</TableCell>
    <TableCell>{task.progress.waitingCount} waiting</TableCell>
  </TableRow>
)
