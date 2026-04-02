import Link from "next/link"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"

type TaskRecordRowProps = {
  organizationSlug: string
  projectSlug: string
  taskRecord: {
    errorCode: string | null
    id: string
    lastTransitionAt: Date
    latestAgentRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      selectedModel: string | null
      state:
        | "aborted"
        | "booting"
        | "completed"
        | "created"
        | "failed"
        | "persisting_outputs"
        | "running"
    } | null
    recordId: string
    recordName: string
    state:
      | "completed"
      | "failed"
      | "in_progress"
      | "picked_up"
      | "skipped"
      | "waiting"
  }
}

const getFailureMessage = (taskRecord: TaskRecordRowProps["taskRecord"]) => {
  const failurePayload = taskRecord.latestAgentRun?.failurePayload

  if (
    failurePayload &&
    "message" in failurePayload &&
    typeof failurePayload.message === "string"
  ) {
    return failurePayload.message
  }

  return taskRecord.errorCode
}

export const TaskRecordRow = ({
  organizationSlug,
  projectSlug,
  taskRecord,
}: TaskRecordRowProps) => (
  <TableRow>
    <TableCell>
      <Link
        className="font-medium text-slate-900 hover:text-slate-600"
        href={`/app/${organizationSlug}/${projectSlug}/records/${taskRecord.recordId}`}
      >
        {taskRecord.recordName}
      </Link>
    </TableCell>
    <TableCell>
      <div className="flex flex-col gap-1">
        <TaskRecordStatusBadge state={taskRecord.state} />
        {taskRecord.state === "failed" && getFailureMessage(taskRecord) ? (
          <span className="text-xs text-rose-700">
            {getFailureMessage(taskRecord)}
          </span>
        ) : null}
      </div>
    </TableCell>
    <TableCell>
      {taskRecord.latestAgentRun ? (
        <RunStatusBadge state={taskRecord.latestAgentRun.state} />
      ) : (
        <span className="text-sm text-slate-500">No run</span>
      )}
    </TableCell>
    <TableCell>
      {taskRecord.latestAgentRun?.selectedModel ?? "Default"}
    </TableCell>
    <TableCell>{taskRecord.lastTransitionAt.toLocaleString()}</TableCell>
  </TableRow>
)
