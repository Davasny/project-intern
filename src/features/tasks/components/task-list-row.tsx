"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { TaskStatusBadge } from "@/components/ui/status-badge/task-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type TaskListRowProps = {
  task: {
    id: string
    progress: {
      completedCount: number
      failedCount: number
      inProgressCount: number
      totalCount: number
      waitingCount: number
    }
    schemaVersion: number
    sortOrder: number
    state:
      | "accepted"
      | "accepting"
      | "accepting_failed"
      | "created"
      | "rejected"
      | "rejecting"
      | "rejecting_failed"
    summaryState:
      | "cancelled"
      | "completed"
      | "failed"
      | "in_progress"
      | "not_started"
      | "partially_completed"
    title: string
  }
}

const draftStatusMap: Record<
  TaskListRowProps["task"]["state"],
  { label: string; tone: "danger" | "info" | "muted" | "success" | "warning" }
> = {
  accepted: { label: "accepted", tone: "success" },
  accepting: { label: "accepting", tone: "info" },
  accepting_failed: { label: "accept failed", tone: "danger" },
  created: { label: "draft", tone: "warning" },
  rejected: { label: "rejected", tone: "danger" },
  rejecting: { label: "rejecting", tone: "info" },
  rejecting_failed: { label: "reject failed", tone: "danger" },
}

export const TaskListRow = ({ task }: TaskListRowProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const invalidateTaskQueries = async () => {
    await queryClient.invalidateQueries(
      trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
    )
    await queryClient.invalidateQueries(
      trpc.projects.overview.queryFilter({ organizationSlug, projectSlug }),
    )
    await queryClient.invalidateQueries(
      trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
    )
  }

  const acceptDraftMutation = useMutation(
    trpc.tasks.acceptDraft.mutationOptions({
      onSuccess: invalidateTaskQueries,
    }),
  )

  const rejectDraftMutation = useMutation(
    trpc.tasks.rejectDraft.mutationOptions({
      onSuccess: invalidateTaskQueries,
    }),
  )

  const isMutationPending =
    acceptDraftMutation.isPending || rejectDraftMutation.isPending

  const handleAccept = async () => {
    await acceptDraftMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      taskId: task.id,
    })
  }

  const handleReject = async () => {
    await rejectDraftMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      taskId: task.id,
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {task.sortOrder}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Link
            className="font-medium text-foreground hover:text-muted-foreground"
            href={`/app/${organizationSlug}/${projectSlug}/tasks/${task.id}`}
          >
            {task.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            Schema v{task.schemaVersion}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {task.state === "accepted" ? (
          <TaskStatusBadge state={task.summaryState} />
        ) : (
          <StatusBadge
            label={draftStatusMap[task.state].label}
            tone={draftStatusMap[task.state].tone}
          />
        )}
      </TableCell>
      <TableCell>
        {task.progress.completedCount}/{task.progress.totalCount} completed
      </TableCell>
      <TableCell>{task.progress.inProgressCount} active</TableCell>
      <TableCell>{task.progress.failedCount} failed</TableCell>
      <TableCell>{task.progress.waitingCount} waiting</TableCell>
      <TableCell>
        {task.state === "created" ? (
          <div className="flex flex-row gap-2">
            <Button
              disabled={isMutationPending}
              onClick={handleReject}
              size="sm"
              type="button"
              variant="outline"
            >
              Reject
            </Button>
            <Button
              disabled={isMutationPending}
              onClick={handleAccept}
              size="sm"
              type="button"
            >
              Accept
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
