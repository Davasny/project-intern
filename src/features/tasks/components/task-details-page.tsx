"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { MarkdownViewer } from "@/components/ui/markdown-viewer/markdown-viewer"
import { MetadataList } from "@/components/ui/metadata-list/metadata-list"
import { MetadataListItem } from "@/components/ui/metadata-list/metadata-list-item"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { PageHeaderMeta } from "@/components/ui/page-header/page-header-meta"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { TaskStatusBadge } from "@/components/ui/status-badge/task-status-badge"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TaskForm } from "@/features/tasks/components/task-form"
import { TaskRecordRow } from "@/features/tasks/components/task-record-row"
import { TaskRevisionItem } from "@/features/tasks/components/task-revision-item"
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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
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
      trpc.projects.overview.queryFilter({ organizationSlug, projectSlug }),
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

  const resetDownstreamMutation = useMutation(
    trpc.tasks.resetDownstream.mutationOptions({
      onSuccess: (result) => {
        if (result.resetCount === 0) {
          toast.info("No terminal downstream task-records to reset.")
        } else {
          toast.success(
            `Reset ${result.resetCount} task-record${result.resetCount === 1 ? "" : "s"} across ${result.affectedTaskIds.length} downstream task${result.affectedTaskIds.length === 1 ? "" : "s"}.`,
          )
        }
        invalidateTaskQueries()
        setIsResetDialogOpen(false)
      },
      onError: () => {
        toast.error("Failed to reset downstream task-records.")
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

  if (schemaVersionsQuery.isLoading || taskQuery.isLoading) {
    return <LoadingState label="Loading task details..." />
  }

  if (!schemaVersionsQuery.data || !taskQuery.data) {
    return <LoadingState label="Task details could not be loaded." />
  }

  const draftStatusLabelMap: Record<typeof taskQuery.data.state, string> = {
    accepted: "accepted",
    accepting: "accepting",
    accepting_failed: "accept failed",
    created: "draft",
    rejected: "rejected",
    rejecting: "rejecting",
    rejecting_failed: "reject failed",
  }

  const draftStatusToneMap: Record<
    typeof taskQuery.data.state,
    "danger" | "info" | "muted" | "success" | "warning"
  > = {
    accepted: "success",
    accepting: "info",
    accepting_failed: "danger",
    created: "warning",
    rejected: "danger",
    rejecting: "info",
    rejecting_failed: "danger",
  }

  const schemaVersionOptions = schemaVersionsQuery.data.map(
    (version) => version.version,
  )

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {taskQuery.data.title}
              </h1>
              {taskQuery.data.state === "accepted" ? (
                <TaskStatusBadge state={taskQuery.data.summaryState} />
              ) : (
                <StatusBadge
                  label={draftStatusLabelMap[taskQuery.data.state]}
                  tone={draftStatusToneMap[taskQuery.data.state]}
                />
              )}
            </div>
            <PageHeaderMeta>
              <span>Sort order {taskQuery.data.sortOrder}</span>
              <span>•</span>
              <span>Schema v{taskQuery.data.schemaVersion}</span>
              <span>•</span>
              <span>{taskQuery.data.updatedAt.toLocaleString()}</span>
            </PageHeaderMeta>
          </div>
          <PageHeaderActions>
            {taskQuery.data.state === "created" ? (
              <>
                <Button
                  disabled={
                    acceptDraftMutation.isPending || rejectDraftMutation.isPending
                  }
                  onClick={handleRejectDraft}
                  type="button"
                  variant="outline"
                >
                  Reject draft
                </Button>
                <Button
                  disabled={
                    acceptDraftMutation.isPending || rejectDraftMutation.isPending
                  }
                  onClick={handleAcceptDraft}
                  type="button"
                >
                  Accept draft
                </Button>
              </>
            ) : null}
            <Button onClick={() => setIsEditOpen(true)} type="button">
              Edit task
            </Button>
            {taskQuery.data.state === "accepted" ? (
              <Button
                onClick={() => setIsResetDialogOpen(true)}
                type="button"
                variant="outline"
              >
                Reset downstream
              </Button>
            ) : null}
          </PageHeaderActions>
        </PageHeader>
        <ProgressMetricGrid>
          <ProgressMetric
            label="Waiting"
            value={taskQuery.data.progress.waitingCount}
          />
          <ProgressMetric
            label="Active"
            value={taskQuery.data.progress.inProgressCount}
          />
          <ProgressMetric
            label="Completed"
            value={taskQuery.data.progress.completedCount}
          />
          <ProgressMetric
            label="Failed"
            value={taskQuery.data.progress.failedCount}
          />
        </ProgressMetricGrid>
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Task contract
            </h2>
            <p className="text-sm text-muted-foreground">
              Canonical descriptive task definition stored on the task itself.
            </p>
          </SectionCardHeader>
          <SectionCardContent className="flex flex-col gap-6">
            <MetadataList>
              <MetadataListItem
                label="Model override"
                value={taskQuery.data.model ?? "Use project default"}
              />
              <MetadataListItem
                label="Temperature override"
                value={
                  taskQuery.data.temperature === null
                    ? "Use project default"
                    : taskQuery.data.temperature.toFixed(1)
                }
              />
              <MetadataListItem
                label="Effective model"
                value={taskQuery.data.effectiveModel}
              />
              <MetadataListItem
                label="Effective temperature"
                value={taskQuery.data.effectiveTemperature.toFixed(1)}
              />
              <MetadataListItem
                label="Created"
                value={taskQuery.data.createdAt.toLocaleString()}
              />
              <MetadataListItem
                label="Updated"
                value={taskQuery.data.updatedAt.toLocaleString()}
              />
            </MetadataList>
            <MarkdownViewer value={taskQuery.data.descriptionMarkdown} />
          </SectionCardContent>
        </SectionCard>
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Per-record progress
            </h2>
            <p className="text-sm text-muted-foreground">
              Persisted task-record and agent-run state only.
            </p>
          </SectionCardHeader>
          <SectionCardContent>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableHeader>Record</TableHeader>
                  <TableHeader>Task record</TableHeader>
                  <TableHeader>Latest run</TableHeader>
                  <TableHeader>Model</TableHeader>
                  <TableHeader>Temperature</TableHeader>
                  <TableHeader>Last transition</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {taskQuery.data.taskRecords.map((taskRecord) => (
                  <TaskRecordRow
                    key={taskRecord.id}
                    taskId={taskQuery.data.id}
                    taskRecord={taskRecord}
                    taskTitle={taskQuery.data.title}
                  />
                ))}
              </TableBody>
            </DataTable>
          </SectionCardContent>
        </SectionCard>
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Revision history
            </h2>
            <p className="text-sm text-muted-foreground">
              Append-only task description revisions.
            </p>
          </SectionCardHeader>
          <SectionCardContent>
            <ActivityTimeline>
              {taskQuery.data.revisions.map((revision) => (
                <TaskRevisionItem key={revision.id} revision={revision} />
              ))}
            </ActivityTimeline>
          </SectionCardContent>
        </SectionCard>
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
              This will reset all completed and skipped task-records for this
              task and later tasks back to waiting state. Active and in-progress
              task-records will not be affected. The scheduler will pick them up
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
    </>
  )
}
