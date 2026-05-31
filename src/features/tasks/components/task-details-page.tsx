"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
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
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { TaskDetailsHeader } from "@/features/tasks/components/task-details-header"
import { TaskForm } from "@/features/tasks/components/task-form"
import { TaskProgressStrip } from "@/features/tasks/components/task-progress-strip"
import { TaskPromptSection } from "@/features/tasks/components/task-prompt-section"
import { WorkRecordsSection } from "@/features/tasks/components/work-records-section"
import { TaskRevisionsSection } from "@/features/tasks/components/task-revisions-section"
import { useTRPC } from "@/lib/trpc/client"

type TaskDetailsPageProps = {
  organizationSlug: string
  projectSlug: string
  taskId: string
}

export const TaskDetailsPage = ({
  organizationSlug,
  projectSlug,
  taskId,
}: TaskDetailsPageProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const schemaVersionsQuery = useQuery(
    trpc.projectSchema.listVersions.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )
  const taskQuery = useQuery({
    ...trpc.tasks.getById.queryOptions({
      organizationSlug,
      projectSlug,
      taskId,
    }),
    refetchInterval: (query) => {
      const task = query.state.data
      return task && task.progress.inProgressCount > 0 ? 3000 : false
    },
  })

  const invalidateTaskQueries = async () => {
    await queryClient.invalidateQueries(
      trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
    )
    await queryClient.invalidateQueries(
      trpc.tasks.getById.queryFilter({ organizationSlug, projectSlug, taskId }),
    )
    await queryClient.invalidateQueries(
      trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
    )
  }

  const acceptDraftMutation = useMutation(
    trpc.tasks.acceptDraft.mutationOptions({ onSuccess: invalidateTaskQueries }),
  )

  const rejectDraftMutation = useMutation(
    trpc.tasks.rejectDraft.mutationOptions({ onSuccess: invalidateTaskQueries }),
  )

  const removeMutation = useMutation(
    trpc.tasks.remove.mutationOptions({
      onSuccess: async () => {
        toast.success(`"${taskQuery.data?.title}" deleted.`)
        await queryClient.invalidateQueries(
          trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
        )
        setIsRemoveDialogOpen(false)
        router.push(`/app/${organizationSlug}/${projectSlug}/tasks`)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }),
  )

  const resetDownstreamMutation = useMutation(
    trpc.tasks.resetDownstream.mutationOptions({
      onSuccess: (result) => {
        if (result.resetCount === 0) {
          toast.info("No terminal downstream work records to reset.")
        } else {
          toast.success(
            `Reset ${result.resetCount} work record${result.resetCount === 1 ? "" : "s"} across ${result.affectedTaskIds.length} downstream task${result.affectedTaskIds.length === 1 ? "" : "s"}.`,
          )
        }
        invalidateTaskQueries()
        setIsResetDialogOpen(false)
      },
      onError: () => {
        toast.error("Failed to reset downstream work records.")
      },
    }),
  )

  const handleResetDownstream = async () => {
    await resetDownstreamMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      taskId,
    })
  }

  const handleAcceptDraft = async () => {
    await acceptDraftMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      taskId,
    })
  }

  const handleRejectDraft = async () => {
    await rejectDraftMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      taskId,
    })
  }

  const handleRemove = async () => {
    await removeMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      taskId,
    })
  }

  if (schemaVersionsQuery.isLoading || taskQuery.isLoading) {
    return <LoadingState label="Loading task details..." />
  }

  if (!schemaVersionsQuery.data || !taskQuery.data) {
    return <LoadingState label="Task details could not be loaded." />
  }

  const schemaVersionOptions = schemaVersionsQuery.data.map(
    (version) => version.version,
  )

  const alwaysDetailRemovableStates = new Set([
    "created",
    "accepting_failed",
    "rejecting_failed",
    "rejected",
  ])

  const isTaskRemovable =
    alwaysDetailRemovableStates.has(taskQuery.data.state) ||
    (taskQuery.data.state === "accepted" &&
      taskQuery.data.workRecords.every(
        (workRecord) => workRecord.latestInternRun === null,
      ))

  const getDeleteDisabledReason = () => {
    if (isTaskRemovable) {
      return null
    }
    if (
      taskQuery.data.state === "accepting" ||
      taskQuery.data.state === "rejecting"
    ) {
      return "Task is currently being processed"
    }
    if (taskQuery.data.state === "accepted") {
      return "Task has been executed and cannot be deleted"
    }
    return "Task cannot be deleted in this state"
  }

  const deleteDisabledReason = getDeleteDisabledReason()

  return (
    <>
      <div className="flex flex-col gap-4">
        <TaskDetailsHeader
          deleteDisabledReason={deleteDisabledReason}
          draftActionPending={
            acceptDraftMutation.isPending || rejectDraftMutation.isPending
          }
          onAcceptDraft={handleAcceptDraft}
          onEditTask={() => setIsEditOpen(true)}
          onRejectDraft={handleRejectDraft}
          onRemoveTask={() => setIsRemoveDialogOpen(true)}
          onResetDownstream={() => setIsResetDialogOpen(true)}
          schemaVersion={taskQuery.data.schemaVersion}
          sortOrder={taskQuery.data.sortOrder}
          state={taskQuery.data.state}
          summaryState={taskQuery.data.summaryState}
          title={taskQuery.data.title}
          updatedAt={taskQuery.data.updatedAt}
        />
        <TaskProgressStrip
          activeCount={taskQuery.data.progress.inProgressCount}
          completedCount={taskQuery.data.progress.completedCount}
          failedCount={taskQuery.data.progress.failedCount}
          skippedCount={taskQuery.data.progress.skippedCount}
          waitingCount={taskQuery.data.progress.waitingCount}
        />
        <TaskPromptSection
          createdAt={taskQuery.data.createdAt}
          descriptionMarkdown={taskQuery.data.descriptionMarkdown}
          effectiveModel={taskQuery.data.effectiveModel}
          effectiveTemperature={taskQuery.data.effectiveTemperature}
          model={taskQuery.data.model}
          schemaVersion={taskQuery.data.schemaVersion}
          sortOrder={taskQuery.data.sortOrder}
          temperature={taskQuery.data.temperature}
          updatedAt={taskQuery.data.updatedAt}
        />
        <WorkRecordsSection
          taskId={taskQuery.data.id}
          workRecords={taskQuery.data.workRecords}
          taskTitle={taskQuery.data.title}
        />
        <TaskRevisionsSection revisions={taskQuery.data.revisions} />
      </div>
      <Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>
              Updating markdown creates a new description revision.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            initialDescriptionMarkdown={taskQuery.data.descriptionMarkdown}
            initialModel={taskQuery.data.model}
            initialTemperature={taskQuery.data.temperature}
            initialSchemaVersion={taskQuery.data.schemaVersion}
            initialTitle={taskQuery.data.title}
            onSubmitted={() => setIsEditOpen(false)}
            schemaVersionOptions={
              schemaVersionOptions.length > 0
                ? schemaVersionOptions
                : [taskQuery.data.schemaVersion]
            }
            taskId={taskQuery.data.id}
            tasks={[]}
          />
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setIsResetDialogOpen} open={isResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset downstream tasks</DialogTitle>
            <DialogDescription>
              This will reset all completed and skipped work records for this
              task and later tasks back to waiting state. Active and in-progress
              work records will not be affected. The scheduler will pick them up
              for re-execution.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row gap-2 justify-end">
            <Button
              onClick={() => setIsResetDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={resetDownstreamMutation.isPending}
              onClick={handleResetDownstream}
              type="button"
            >
              {resetDownstreamMutation.isPending
                ? "Resetting..."
                : "Reset downstream"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setIsRemoveDialogOpen} open={isRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              {taskQuery.data.state === "accepted"
                ? "This task and its work records will be permanently deleted. No intern runs exist for this task."
                : `"${taskQuery.data.title}" will be permanently deleted.`}
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
