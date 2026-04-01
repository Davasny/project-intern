"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
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
import { SidePanel } from "@/components/ui/side-panel/side-panel"
import { SidePanelHeader } from "@/components/ui/side-panel/side-panel-header"
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
  const [isEditOpen, setIsEditOpen] = useState(false)
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

  if (schemaVersionsQuery.isLoading || taskQuery.isLoading) {
    return <LoadingState label="Loading task details..." />
  }

  if (!schemaVersionsQuery.data || !taskQuery.data) {
    return <LoadingState label="Task details could not be loaded." />
  }

  const schemaVersionOptions = schemaVersionsQuery.data.map(
    (version) => version.version,
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <PageHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {taskQuery.data.title}
              </h1>
              <TaskStatusBadge state={taskQuery.data.summaryState} />
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
            <Button onClick={() => setIsEditOpen(!isEditOpen)} type="button">
              {isEditOpen ? "Hide editor" : "Edit task"}
            </Button>
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
            <h2 className="text-lg font-semibold text-slate-950">
              Task contract
            </h2>
            <p className="text-sm text-slate-500">
              Canonical descriptive task definition stored on the task itself.
            </p>
          </SectionCardHeader>
          <SectionCardContent className="flex flex-col gap-6">
            <MetadataList>
              <MetadataListItem
                label="Model override"
                value={taskQuery.data.model ?? "Default project model"}
              />
              <MetadataListItem
                label="Pipeline version"
                value={taskQuery.data.pipelineVersion ?? "Not linked"}
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
            <h2 className="text-lg font-semibold text-slate-950">
              Per-record progress
            </h2>
            <p className="text-sm text-slate-500">
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
                  <TableHeader>Last transition</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {taskQuery.data.taskRecords.map((taskRecord) => (
                  <TaskRecordRow
                    key={taskRecord.id}
                    organizationSlug={organizationSlug}
                    projectSlug={projectSlug}
                    taskRecord={taskRecord}
                  />
                ))}
              </TableBody>
            </DataTable>
          </SectionCardContent>
        </SectionCard>
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-slate-950">
              Revision history
            </h2>
            <p className="text-sm text-slate-500">
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
      {isEditOpen ? (
        <SidePanel>
          <SidePanelHeader>
            <h2 className="text-lg font-semibold text-slate-950">Edit task</h2>
            <p className="text-sm text-slate-500">
              Updating markdown creates a new description revision.
            </p>
          </SidePanelHeader>
          <TaskForm
            initialDescriptionMarkdown={taskQuery.data.descriptionMarkdown}
            initialModel={taskQuery.data.model}
            initialPipelineVersion={taskQuery.data.pipelineVersion}
            initialSchemaVersion={taskQuery.data.schemaVersion}
            initialTitle={taskQuery.data.title}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            schemaVersionOptions={
              schemaVersionOptions.length > 0
                ? schemaVersionOptions
                : [taskQuery.data.schemaVersion]
            }
            taskId={taskQuery.data.id}
          />
        </SidePanel>
      ) : (
        <div />
      )}
    </div>
  )
}
