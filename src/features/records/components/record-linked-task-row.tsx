import Link from "next/link"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"

type RecordLinkedTaskRowProps = {
  organizationSlug: string
  projectSlug: string
  task: {
    latestAgentRun: {
      state:
        | "aborted"
        | "booting"
        | "completed"
        | "created"
        | "failed"
        | "persisting_outputs"
        | "running"
    } | null
    state:
      | "completed"
      | "failed"
      | "in_progress"
      | "picked_up"
      | "skipped"
      | "waiting"
    taskId: string
    title: string
  }
}

export const RecordLinkedTaskRow = ({
  organizationSlug,
  projectSlug,
  task,
}: RecordLinkedTaskRowProps) => (
  <TableRow>
    <TableCell>
      <Link
        className="font-medium text-slate-900 hover:text-slate-600"
        href={`/app/${organizationSlug}/${projectSlug}/tasks/${task.taskId}`}
      >
        {task.title}
      </Link>
    </TableCell>
    <TableCell>
      <TaskRecordStatusBadge state={task.state} />
    </TableCell>
    <TableCell>
      {task.latestAgentRun ? (
        <RunStatusBadge state={task.latestAgentRun.state} />
      ) : (
        <span className="text-sm text-slate-500">No run</span>
      )}
    </TableCell>
  </TableRow>
)
