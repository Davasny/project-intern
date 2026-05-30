"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlayIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { isFailedAgentRunState } from "@/features/execution/lib/is-failed-agent-run-state"
import { isRetryableTaskRecordState } from "@/features/execution/lib/is-retryable-task-record-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import { useTRPC } from "@/lib/trpc/client"

type ExecutionMatrixCellActionProps = {
  debugControlsEnabled: boolean
  isAutopickEnabled: boolean
  taskRecord: {
    latestAgentRun: {
      state: AgentRunState
    } | null
    recordId: string
    state: TaskRecordState
    taskRecordId: string
  }
}

export const ExecutionMatrixCellAction = ({
  debugControlsEnabled,
  isAutopickEnabled,
  taskRecord,
}: ExecutionMatrixCellActionProps) => {
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

  const canTrigger =
    debugControlsEnabled && !isAutopickEnabled && taskRecord.state === "waiting"
  const canRetry = isRetryableTaskRecordState(taskRecord.state)
  const hasFailedLatestRun = taskRecord.latestAgentRun
    ? isFailedAgentRunState(taskRecord.latestAgentRun.state)
    : false
  const shouldShowRetry = canRetry || (canTrigger && hasFailedLatestRun)

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

  if (shouldShowRetry) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Retry task record"
            isLoading={
              canRetry
                ? retryTaskRecordMutation.isPending
                : triggerTaskRecordMutation.isPending
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
            aria-label="Trigger task record"
            isLoading={triggerTaskRecordMutation.isPending}
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
