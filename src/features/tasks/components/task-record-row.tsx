"use client"

import Link from "next/link"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"

type TaskRecordRowProps = {
  taskRecord: {
    errorCode: string | null
    id: string
    lastTransitionAt: Date
    latestAgentRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      selectedModel: string | null
      selectedTemperature: number | null
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

export const TaskRecordRow = ({ taskRecord }: TaskRecordRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()

  return (
    <TableRow>
      <TableCell>
        <Link
          className="font-medium text-foreground hover:text-muted-foreground"
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
          <Link
            className="cursor-pointer"
            href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${taskRecord.latestAgentRun.id}`}
          >
            <RunStatusBadge state={taskRecord.latestAgentRun.state} />
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">No run</span>
        )}
      </TableCell>
      <TableCell>
        {taskRecord.latestAgentRun?.selectedModel ?? "Default"}
      </TableCell>
      <TableCell>
        {taskRecord.latestAgentRun?.selectedTemperature?.toFixed(1) ?? "Default"}
      </TableCell>
      <TableCell>{taskRecord.lastTransitionAt.toLocaleString()}</TableCell>
    </TableRow>
  )
}
