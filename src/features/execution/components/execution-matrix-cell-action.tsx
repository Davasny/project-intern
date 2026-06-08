"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlayIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import { isFailedInternRunState } from "@/features/execution/lib/is-failed-intern-run-state"
import { isRetryableWorkRecordState } from "@/features/work-records/schemas/work-record-state"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type ExecutionMatrixCellActionProps = {
  debugControlsEnabled: boolean
  isAutopickEnabled: boolean
  workRecord: {
    blocker: {
      state: WorkRecordState
      taskTitle: string
    } | null
    latestInternRun: {
      state: InternRunState
    } | null
    recordId: string
    state: WorkRecordState
    workRecordId: string
  }
}

export const ExecutionMatrixCellAction = ({
  debugControlsEnabled,
  isAutopickEnabled,
  workRecord,
}: ExecutionMatrixCellActionProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const triggerWorkRecordMutation = useMutation(
    trpc.execution.triggerWorkRecord.mutationOptions({
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
  const retryWorkRecordMutation = useMutation(
    trpc.records.retryWorkRecord.mutationOptions({
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

  const canTrigger =
    debugControlsEnabled &&
    !isAutopickEnabled &&
    workRecord.state === "waiting" &&
    workRecord.blocker === null
  const canRetry = isRetryableWorkRecordState(workRecord.state)
  const hasFailedLatestRun = workRecord.latestInternRun
    ? isFailedInternRunState(workRecord.latestInternRun.state)
    : false
  const shouldShowRetry = canRetry || (canTrigger && hasFailedLatestRun)

  const handleTrigger = async () => {
    try {
      await triggerWorkRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        workRecordId: workRecord.workRecordId,
      })
    } catch {
    }
  }

  const handleRetry = async () => {
    try {
      await retryWorkRecordMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        recordId: workRecord.recordId,
        workRecordId: workRecord.workRecordId,
      })
    } catch {
    }
  }

  if (shouldShowRetry) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Retry work record"
            isLoading={
              canRetry
                ? retryWorkRecordMutation.isPending
                : triggerWorkRecordMutation.isPending
            }
            onClick={canRetry ? handleRetry : handleTrigger}
            size="icon-xs"
            type="button"
            variant="outline"
          >
            <RefreshCwIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Retry</TooltipContent>
      </Tooltip>
    )
  }

  if (canTrigger) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Trigger work record"
            isLoading={triggerWorkRecordMutation.isPending}
            onClick={handleTrigger}
            size="icon-xs"
            type="button"
            variant="outline"
          >
            <PlayIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Trigger execution</TooltipContent>
      </Tooltip>
    )
  }

  return null
}
