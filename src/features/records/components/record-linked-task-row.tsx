"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordRunStatusBadge } from "@/components/ui/status-badge/task-record-run-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import { useTRPC } from "@/lib/trpc/client"

type RecordLinkedTaskRowProps = {
  nextWaitingSortOrder: number | null
  recordId: string
  task: {
    latestAgentRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      state: AgentRunState
    } | null
    sortOrder: number
    state: TaskRecordState
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

const isRetryableState = (state: TaskRecordState) =>
  state === "failed" ||
  state === "picked_up_failed" ||
  state === "completed_failed" ||
  state === "failed_failed"

export const RecordLinkedTaskRow = ({
  nextWaitingSortOrder,
  recordId,
  task,
}: RecordLinkedTaskRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const invalidateRecordTaskQueries = async () => {
    await queryClient.invalidateQueries(
      trpc.records.getById.queryFilter({
        organizationSlug,
        projectSlug,
        recordId,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.records.list.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.tasks.getById.queryFilter({
        organizationSlug,
        projectSlug,
        taskId: task.taskId,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.tasks.list.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.projects.overview.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.execution.getMonitor.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
  }

  const retryTaskRecordMutation = useMutation(
    trpc.records.retryTaskRecord.mutationOptions({
      onSuccess: invalidateRecordTaskQueries,
    }),
  )
  const canRetry = isRetryableState(task.state)
  const canTrigger =
    task.state === "waiting" &&
    nextWaitingSortOrder !== null &&
    task.sortOrder === nextWaitingSortOrder

  const handleRetry = async () => {
    try {
      await retryTaskRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId,
        taskRecordId: task.taskRecordId,
      })
    } catch {
    }
  }

  const triggerTaskRecordMutation = useMutation(
    trpc.records.triggerTaskRecord.mutationOptions({
      onSuccess: invalidateRecordTaskQueries,
    }),
  )

  const handleTrigger = async () => {
    try {
      await triggerTaskRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId,
        taskRecordId: task.taskRecordId,
      })
    } catch {
    }
  }

  const resetDownstreamTaskRecordMutation = useMutation(
    trpc.records.resetDownstreamTaskRecord.mutationOptions({
      onSuccess: async (result) => {
        if (result.resetCount === 0) {
          toast.info("No terminal downstream task-records to reset.")
        } else {
          toast.success(
            `Reset ${result.resetCount} downstream task-record${result.resetCount === 1 ? "" : "s"} for this record.`,
          )
        }
        await invalidateRecordTaskQueries()
        setIsResetDialogOpen(false)
      },
      onError: () => {
        toast.error("Failed to reset downstream task-records for this record.")
      },
    }),
  )

  const handleResetDownstream = async () => {
    await resetDownstreamTaskRecordMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      recordId,
      taskRecordId: task.taskRecordId,
    })
  }

  const actionError =
    triggerTaskRecordMutation.error ??
    retryTaskRecordMutation.error ??
    resetDownstreamTaskRecordMutation.error
  const latestAgentRun = task.latestAgentRun
  const latestRunHref = latestAgentRun
    ? `/app/${organizationSlug}/${projectSlug}/execution/runs/${latestAgentRun.id}`
    : null

  return (
    <>
      <TableRow>
      <TableCell>
        <Link
          className="font-medium text-foreground hover:text-muted-foreground"
          href={`/app/${organizationSlug}/${projectSlug}/tasks/${task.taskId}`}
        >
          {task.title}
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <TaskRecordRunStatusBadge
            runHref={latestRunHref}
            state={task.state}
          />
          {task.state === "failed" && getFailureMessage(task) ? (
            <span className="text-xs text-rose-700">
              {getFailureMessage(task)}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {latestAgentRun ? (
          <Link
            className="cursor-pointer"
            href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${latestAgentRun.id}`}
          >
            <RunStatusBadge state={latestAgentRun.state} />
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">No run</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="flex flex-row gap-2">
            {canTrigger ? (
              <Button
                disabled={triggerTaskRecordMutation.isPending}
                onClick={handleTrigger}
                variant="secondary"
              >
                {triggerTaskRecordMutation.isPending
                  ? "Triggering..."
                  : "Trigger"}
              </Button>
            ) : canRetry ? (
              <Button
                disabled={retryTaskRecordMutation.isPending}
                onClick={handleRetry}
                variant="secondary"
              >
                {retryTaskRecordMutation.isPending ? "Retrying..." : "Retry"}
              </Button>
            ) : null}
            <Button
              disabled={resetDownstreamTaskRecordMutation.isPending}
              onClick={() => setIsResetDialogOpen(true)}
              variant="outline"
            >
              Reset downstream
            </Button>
          </div>
          {actionError ? (
            <span className="max-w-80 text-xs text-destructive">
              {actionError.message}
            </span>
          ) : null}
        </div>
      </TableCell>
      </TableRow>
      <Dialog onOpenChange={setIsResetDialogOpen} open={isResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset downstream tasks for this record</DialogTitle>
            <DialogDescription>
              This will reset completed and skipped task-records from “
              {task.title}” onward back to waiting state for this record only.
              Other records will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row justify-end gap-2">
            <Button
              onClick={() => setIsResetDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={resetDownstreamTaskRecordMutation.isPending}
              onClick={handleResetDownstream}
              type="button"
            >
              {resetDownstreamTaskRecordMutation.isPending
                ? "Resetting..."
                : "Reset downstream"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
