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
import { WorkRecordStatusBadge } from "@/components/ui/status-badge/work-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"
import { useTRPC } from "@/lib/trpc/client"

type WorkRecordRowProps = {
  taskId: string
  taskTitle: string
  workRecord: {
    errorCode: string | null
    id: string
    lastTransitionAt: Date
    latestInternRun: {
      id: string
      failurePayload: Record<string, unknown> | null
      selectedModel: string | null
      selectedTemperature: number | null
      state: InternRunState
      statusTooltipText: string | null
    } | null
    recordId: string
    recordName: string
    state: WorkRecordState
  }
}

const getFailureMessage = (workRecord: WorkRecordRowProps["workRecord"]) => {
  const failurePayload = workRecord.latestInternRun?.failurePayload

  if (
    failurePayload &&
    "reason" in failurePayload &&
    typeof failurePayload.reason === "string"
  ) {
    return failurePayload.reason
  }

  if (
    failurePayload &&
    "message" in failurePayload &&
    typeof failurePayload.message === "string"
  ) {
    return failurePayload.message
  }

  return workRecord.errorCode
}

export const WorkRecordRow = ({
  taskId,
  workRecord,
  taskTitle,
}: WorkRecordRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const invalidateWorkRecordQueries = async () => {
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
        recordId: workRecord.recordId,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.records.list.queryFilter({
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
        await invalidateWorkRecordQueries()
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
      recordId: workRecord.recordId,
      workRecordId: workRecord.id,
    })
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <Link
            className="font-medium text-foreground hover:text-muted-foreground"
            href={`/app/${organizationSlug}/${projectSlug}/records/${workRecord.recordId}`}
          >
            {workRecord.recordName}
          </Link>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <WorkRecordStatusBadge state={workRecord.state} />
            {workRecord.state === "failed" && getFailureMessage(workRecord) ? (
              <span className="text-xs text-rose-700">
                {getFailureMessage(workRecord)}
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell>
          {workRecord.latestInternRun ? (
            <div className="flex flex-col gap-1">
              <Link
                className="cursor-pointer"
                href={`/app/${organizationSlug}/${projectSlug}/intern-runs/${workRecord.latestInternRun.id}`}
              >
                <RunStatusBadge
                  labelSuffix={null}
                  state={workRecord.latestInternRun.state}
                  tooltipText={workRecord.latestInternRun.statusTooltipText}
                />
              </Link>
              {workRecord.latestInternRun.selectedModel ? (
                <span className="max-w-64 truncate text-xs text-muted-foreground">
                  {workRecord.latestInternRun.selectedModel}
                  {workRecord.latestInternRun.selectedTemperature === null
                    ? null
                    : ` · ${workRecord.latestInternRun.selectedTemperature.toFixed(1)}`}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No run</span>
          )}
        </TableCell>
        <TableCell>{workRecord.lastTransitionAt.toLocaleString()}</TableCell>
        <TableCell className="text-right">
          <Button
            disabled={resetDownstreamWorkRecordMutation.isPending}
            onClick={() => setIsResetDialogOpen(true)}
            variant="outline"
          >
            Reset downstream
          </Button>
          {resetDownstreamWorkRecordMutation.error ? (
            <span className="block max-w-80 text-xs text-destructive">
              {resetDownstreamWorkRecordMutation.error.message}
            </span>
          ) : null}
        </TableCell>
      </TableRow>
      <Dialog onOpenChange={setIsResetDialogOpen} open={isResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset downstream tasks for this record</DialogTitle>
            <DialogDescription>
              This will reset completed and skipped work records from “
              {taskTitle}” onward back to waiting state for
              {workRecord.recordName} only. Other records will not be affected.
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
