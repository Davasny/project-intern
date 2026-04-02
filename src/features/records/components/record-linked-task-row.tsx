"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type RecordLinkedTaskRowProps = {
  nextWaitingSortOrder: number | null
  recordId: string
  task: {
    latestAgentRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      state:
        | "aborted"
        | "booting"
        | "completed"
        | "created"
        | "failed"
        | "persisting_outputs"
        | "running"
    } | null
    sortOrder: number
    state:
      | "completed"
      | "failed"
      | "in_progress"
      | "picked_up"
      | "skipped"
      | "waiting"
    errorCode: string | null
    taskId: string
    taskRecordId: string
    title: string
  }
}

const getFailureMessage = (task: RecordLinkedTaskRowProps["task"]) => {
  const failurePayload = task.latestAgentRun?.failurePayload

  if (
    failurePayload &&
    "message" in failurePayload &&
    typeof failurePayload.message === "string"
  ) {
    return failurePayload.message
  }

  return task.errorCode
}

export const RecordLinkedTaskRow = ({
  nextWaitingSortOrder,
  recordId,
  task,
}: RecordLinkedTaskRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const retryTaskRecordMutation = useMutation(
    trpc.records.retryTaskRecord.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.getById.queryFilter({
            organizationSlug,
            projectSlug,
            recordId,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.execution.getMonitor.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )
  const canRetry = task.state === "failed" || task.state === "skipped"
  const canTrigger =
    task.state === "waiting" &&
    nextWaitingSortOrder !== null &&
    task.sortOrder === nextWaitingSortOrder

  const handleRetry = async () => {
    await retryTaskRecordMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      recordId,
      taskRecordId: task.taskRecordId,
    })
  }

  const triggerTaskRecordMutation = useMutation(
    trpc.records.triggerTaskRecord.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.getById.queryFilter({
            organizationSlug,
            projectSlug,
            recordId,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.execution.getMonitor.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )

  const handleTrigger = async () => {
    await triggerTaskRecordMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      recordId,
      taskRecordId: task.taskRecordId,
    })
  }

  return (
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
        <div className="flex flex-col gap-1">
          <TaskRecordStatusBadge state={task.state} />
          {task.state === "failed" && getFailureMessage(task) ? (
            <span className="text-xs text-rose-700">
              {getFailureMessage(task)}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {task.latestAgentRun ? (
          <Link
            className="cursor-pointer"
            href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${task.latestAgentRun.id}`}
          >
            <RunStatusBadge state={task.latestAgentRun.state} />
          </Link>
        ) : (
          <span className="text-sm text-slate-500">No run</span>
        )}
      </TableCell>
      <TableCell>
        {canTrigger ? (
          <Button
            disabled={triggerTaskRecordMutation.isPending}
            onClick={handleTrigger}
            variant="secondary"
          >
            {triggerTaskRecordMutation.isPending ? "Triggering..." : "Trigger"}
          </Button>
        ) : canRetry ? (
          <Button
            disabled={retryTaskRecordMutation.isPending}
            onClick={handleRetry}
            variant="secondary"
          >
            {retryTaskRecordMutation.isPending ? "Retrying..." : "Retry"}
          </Button>
        ) : (
          <span className="text-sm text-slate-500">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
