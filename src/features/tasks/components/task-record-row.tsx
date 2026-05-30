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
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import { useTRPC } from "@/lib/trpc/client"

type TaskRecordRowProps = {
  taskId: string
  taskTitle: string
  taskRecord: {
    errorCode: string | null
    id: string
    lastTransitionAt: Date
    latestAgentRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      selectedModel: string | null
      selectedTemperature: number | null
      state: AgentRunState
    } | null
    recordId: string
    recordName: string
    state: TaskRecordState
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
  taskId,
  taskRecord,
  taskTitle,
}: TaskRecordRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const invalidateTaskRecordQueries = async () => {
    await queryClient.invalidateQueries(
      trpc.tasks.getById.queryFilter({
        organizationSlug,
        projectSlug,
        taskId,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.tasks.list.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.records.getById.queryFilter({
        organizationSlug,
        projectSlug,
        recordId: taskRecord.recordId,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.records.list.queryFilter({
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
        await invalidateTaskRecordQueries()
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
      recordId: taskRecord.recordId,
      taskRecordId: taskRecord.id,
    })
  }

  return (
    <>
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
            <div className="flex flex-col gap-1">
              <Link
                className="cursor-pointer"
                href={`/app/${organizationSlug}/${projectSlug}/execution/runs/${taskRecord.latestAgentRun.id}`}
              >
                <RunStatusBadge state={taskRecord.latestAgentRun.state} />
              </Link>
              {taskRecord.latestAgentRun.selectedModel ? (
                <span className="max-w-64 truncate text-xs text-muted-foreground">
                  {taskRecord.latestAgentRun.selectedModel}
                  {taskRecord.latestAgentRun.selectedTemperature === null
                    ? null
                    : ` · ${taskRecord.latestAgentRun.selectedTemperature.toFixed(1)}`}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No run</span>
          )}
        </TableCell>
        <TableCell>{taskRecord.lastTransitionAt.toLocaleString()}</TableCell>
        <TableCell className="text-right">
          <Button
            disabled={resetDownstreamTaskRecordMutation.isPending}
            onClick={() => setIsResetDialogOpen(true)}
            variant="outline"
          >
            Reset downstream
          </Button>
          {resetDownstreamTaskRecordMutation.error ? (
            <span className="block max-w-80 text-xs text-destructive">
              {resetDownstreamTaskRecordMutation.error.message}
            </span>
          ) : null}
        </TableCell>
      </TableRow>
      <Dialog onOpenChange={setIsResetDialogOpen} open={isResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset downstream tasks for this record</DialogTitle>
            <DialogDescription>
              This will reset completed and skipped task-records from “
              {taskTitle}” onward back to waiting state for
              {taskRecord.recordName} only. Other records will not be affected.
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
