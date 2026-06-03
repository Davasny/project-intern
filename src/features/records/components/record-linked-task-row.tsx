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
import { RunStatusBadge } from "@/components/ui/status-badge/intern-run-status-badge"
import { WorkRecordRunStatusBadge } from "@/components/ui/status-badge/work-record-intern-run-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { isRetryableWorkRecordState } from "@/features/work-records/schemas/work-record-state"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"
import { useTRPC } from "@/lib/trpc/client"

type RecordLinkedTaskRowProps = {
  nextWaitingSortOrder: number | null
  recordId: string
  task: {
    latestInternRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      state: InternRunState
      statusTooltipText: string | null
    } | null
    sortOrder: number
    state: WorkRecordState
    errorCode: string | null
    taskId: string
    workRecordId: string
    title: string
  }
}

const getFailureMessage = (task: RecordLinkedTaskRowProps["task"]) => {
  const failurePayload = task.latestInternRun?.failurePayload

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
      trpc.execution.getMonitor.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
  }

  const retryWorkRecordMutation = useMutation(
    trpc.records.retryWorkRecord.mutationOptions({
      onSuccess: invalidateRecordTaskQueries,
    }),
  )
  const canRetry = isRetryableWorkRecordState(task.state)
  const canTrigger =
    task.state === "waiting" &&
    nextWaitingSortOrder !== null &&
    task.sortOrder === nextWaitingSortOrder

  const handleRetry = async () => {
    try {
      await retryWorkRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId,
        workRecordId: task.workRecordId,
      })
    } catch {
    }
  }

  const triggerWorkRecordMutation = useMutation(
    trpc.records.triggerWorkRecord.mutationOptions({
      onSuccess: invalidateRecordTaskQueries,
    }),
  )

  const handleTrigger = async () => {
    try {
      await triggerWorkRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId,
        workRecordId: task.workRecordId,
      })
    } catch {
    }
  }

  const resetDownstreamWorkRecordMutation = useMutation(
    trpc.records.resetDownstreamWorkRecord.mutationOptions({
      onSuccess: async (result) => {
        if (result.resetCount === 0) {
          toast.info("No terminal downstream work records to reset.")
        } else {
          toast.success(
            `Reset ${result.resetCount} downstream work record${result.resetCount === 1 ? "" : "s"} for this record.`,
          )
        }
        await invalidateRecordTaskQueries()
        setIsResetDialogOpen(false)
      },
      onError: () => {
        toast.error("Failed to reset downstream work records for this record.")
      },
    }),
  )

  const handleResetDownstream = async () => {
    await resetDownstreamWorkRecordMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      recordId,
      workRecordId: task.workRecordId,
    })
  }

  const actionError =
    triggerWorkRecordMutation.error ??
    retryWorkRecordMutation.error ??
    resetDownstreamWorkRecordMutation.error
  const latestInternRun = task.latestInternRun
  const latestRunHref = latestInternRun
    ? `/app/${organizationSlug}/${projectSlug}/intern-runs/${latestInternRun.id}`
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
          <WorkRecordRunStatusBadge
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
        {latestInternRun ? (
          <Link
            className="cursor-pointer"
            href={`/app/${organizationSlug}/${projectSlug}/intern-runs/${latestInternRun.id}`}
          >
            <RunStatusBadge
              labelSuffix={null}
              state={latestInternRun.state}
              tooltipText={latestInternRun.statusTooltipText}
            />
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
                disabled={triggerWorkRecordMutation.isPending}
                onClick={handleTrigger}
                variant="secondary"
              >
                {triggerWorkRecordMutation.isPending
                  ? "Triggering..."
                  : "Trigger"}
              </Button>
            ) : canRetry ? (
              <Button
                disabled={retryWorkRecordMutation.isPending}
                onClick={handleRetry}
                variant="secondary"
              >
                {retryWorkRecordMutation.isPending ? "Retrying..." : "Retry"}
              </Button>
            ) : null}
            <Button
              disabled={resetDownstreamWorkRecordMutation.isPending}
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
              This will reset completed and skipped work records from “
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
              disabled={resetDownstreamWorkRecordMutation.isPending}
              onClick={handleResetDownstream}
              type="button"
            >
              {resetDownstreamWorkRecordMutation.isPending
                ? "Resetting..."
                : "Reset downstream"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
