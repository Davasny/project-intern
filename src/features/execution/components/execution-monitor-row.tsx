"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import {
  type TaskRecordState,
} from "@/features/task-records/schemas/task-record-state"
import { useTRPC } from "@/lib/trpc/client"

type ExecutionMonitorRowProps = {
  debugControlsEnabled: boolean
  isAutopickEnabled: boolean
  taskRecord: {
    attemptCount: number
    lastTransitionAt: Date
    latestAgentRun: {
      id: string
      state: AgentRunState
    } | null
    recordId: string
    recordName: string
    state: TaskRecordState
    taskId: string
    taskRecordId: string
    taskSortOrder: number
    taskTitle: string
  }
}

const isRetryableState = (state: TaskRecordState) =>
  state === "failed" ||
  state === "picked_up_failed" ||
  state === "completed_failed" ||
  state === "failed_failed"

export const ExecutionMonitorRow = ({
  debugControlsEnabled,
  isAutopickEnabled,
  taskRecord,
}: ExecutionMonitorRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const triggerTaskRecordMutation = useMutation(
    trpc.execution.triggerTaskRecord.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.execution.getMonitor.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )
  const retryTaskRecordMutation = useMutation(
    trpc.records.retryTaskRecord.mutationOptions({
      onSuccess: async () => {
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
    try {
      await triggerTaskRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        taskRecordId: taskRecord.taskRecordId,
      })
    } catch {
    }
  }
  const handleRetry = async () => {
    try {
      await retryTaskRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId: taskRecord.recordId,
        taskRecordId: taskRecord.taskRecordId,
      })
    } catch {
    }
  }

  const canTrigger =
    debugControlsEnabled && !isAutopickEnabled && taskRecord.state === "waiting"
  const canRetry = isRetryableState(taskRecord.state)
  const actionError =
    triggerTaskRecordMutation.error ?? retryTaskRecordMutation.error

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {taskRecord.taskSortOrder}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Link
            className="font-medium text-foreground hover:text-muted-foreground"
            href={`/app/${organizationSlug}/${projectSlug}/tasks/${taskRecord.taskId}`}
          >
            {taskRecord.taskTitle}
          </Link>
          <Link
            className="text-xs text-muted-foreground hover:text-foreground"
            href={`/app/${organizationSlug}/${projectSlug}/records/${taskRecord.recordId}`}
          >
            {taskRecord.recordName}
          </Link>
        </div>
      </TableCell>
      <TableCell>
        <Link
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/app/${organizationSlug}/${projectSlug}/records/${taskRecord.recordId}`}
        >
          <TaskRecordStatusBadge state={taskRecord.state} />
        </Link>
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
          <span className="text-sm text-muted-foreground">No run yet</span>
        )}
      </TableCell>
      <TableCell>{taskRecord.attemptCount}</TableCell>
      <TableCell>{taskRecord.lastTransitionAt.toLocaleString()}</TableCell>
      <TableCell>
        {canTrigger || canRetry ? (
          <div className="flex flex-row flex-wrap items-center gap-2">
            <Button
              disabled={
                canRetry
                  ? retryTaskRecordMutation.isPending
                  : triggerTaskRecordMutation.isPending
              }
              onClick={canRetry ? handleRetry : handleTrigger}
              type="button"
              variant="secondary"
            >
              {canRetry
                ? retryTaskRecordMutation.isPending
                  ? "Retrying..."
                  : "Retry"
                : triggerTaskRecordMutation.isPending
                  ? "Triggering..."
                  : "Trigger"}
            </Button>
            {actionError ? (
              <span className="basis-full text-xs text-destructive">
                {actionError.message}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
