"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { GripVertical, Trash2Icon } from "lucide-react"
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
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { TaskStatusBadge } from "@/components/ui/status-badge/task-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type TaskListRowProps = {
  task: {
    id: string
    effectiveTemperature: number
    progress: {
      completedCount: number
      failedCount: number
      inProgressCount: number
      skippedCount: number
      totalCount: number
      waitingCount: number
    }
    model: string | null
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
    temperature: number | null
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const invalidateTaskQueries = async () => {
    await queryClient.invalidateQueries(
      trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
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

  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  const removeMutation = useMutation(
    trpc.tasks.remove.mutationOptions({
      onSuccess: async () => {
        toast.success(`"${task.title}" deleted.`)
        await invalidateTaskQueries()
        setIsRemoveDialogOpen(false)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }),
  )

  const isMutationPending =
    acceptDraftMutation.isPending ||
    rejectDraftMutation.isPending ||
    removeMutation.isPending

  const isListRemovable =
    task.state === "created" ||
    task.state === "accepting_failed" ||
    task.state === "rejecting_failed" ||
    task.state === "rejected"

  const deleteDisabledReason = isListRemovable
    ? null
    : task.state === "accepting" || task.state === "rejecting"
      ? "Task is currently being processed"
      : task.state === "accepted"
        ? "Open task details to delete"
        : null

  const handleRemove = async () => {
    await removeMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      taskId: task.id,
    })
  }

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
    <>
      <TableRow
        ref={setNodeRef}
        className={
          isDragging ? "opacity-50 z-10 relative shadow-lg" : "group"
        }
        style={style}
      >
        <TableCell className="w-10">
          <GripVertical
            className="size-4 cursor-grab opacity-0 group-hover:opacity-100 text-muted-foreground"
            {...attributes}
            {...listeners}
          />
        </TableCell>
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
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {task.effectiveTemperature.toFixed(1)}
              {task.temperature === null ? " (default)" : " (override)"}
            </span>
            {task.model !== null ? (
              <span className="break-words text-xs text-muted-foreground">
                {task.model}
              </span>
            ) : null}
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
          {task.progress.completedCount}/{task.progress.totalCount}
        </TableCell>
        <TableCell>{task.progress.inProgressCount}</TableCell>
        <TableCell>{task.progress.failedCount}</TableCell>
        <TableCell>{task.progress.skippedCount}</TableCell>
        <TableCell>{task.progress.waitingCount}</TableCell>
        <TableCell>
          <div className="flex flex-row gap-2">
            {task.state === "created" ? (
              <>
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
              </>
            ) : null}
            {deleteDisabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      disabled
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{deleteDisabledReason}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                disabled={isMutationPending}
                onClick={() => setIsRemoveDialogOpen(true)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2Icon />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      <Dialog
        onOpenChange={setIsRemoveDialogOpen}
        open={isRemoveDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              {task.state === "accepted"
                ? "This task and its work records will be permanently deleted. No intern runs exist for this task."
                : `"${task.title}" will be permanently deleted.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row justify-end gap-2">
            <Button
              onClick={() => setIsRemoveDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={removeMutation.isPending}
              isLoading={removeMutation.isPending}
              onClick={handleRemove}
              type="button"
              variant="destructive"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
