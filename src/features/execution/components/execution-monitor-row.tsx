"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
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
    recordName: string
    state: TaskRecordState
    taskRecordId: string
    taskSortOrder: number
    taskTitle: string
  }
}

export const ExecutionMonitorRow = ({
  debugControlsEnabled,
  isAutopickEnabled,
  taskRecord,
}: ExecutionMonitorRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const triggerMutation = useMutation(
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

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {taskRecord.taskSortOrder}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
            {taskRecord.taskTitle}
          </span>
          <span className="text-xs text-muted-foreground">
            {taskRecord.recordName}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <TaskRecordStatusBadge state={taskRecord.state} />
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
        {debugControlsEnabled &&
        !isAutopickEnabled &&
        taskRecord.state === "waiting" ? (
          <Button
            disabled={triggerMutation.isPending}
            onClick={() =>
              triggerMutation.mutate({
                organizationSlug,
                projectSlug,
                taskRecordId: taskRecord.taskRecordId,
              })
            }
            type="button"
            variant="secondary"
          >
            {triggerMutation.isPending ? "Triggering..." : "Trigger"}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
