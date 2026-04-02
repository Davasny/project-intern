"use client"

import { useQuery } from "@tanstack/react-query"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderMeta } from "@/components/ui/page-header/page-header-meta"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { TaskStatusBadge } from "@/components/ui/status-badge/task-status-badge"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const ProjectOverviewPage = () => {
  const { organizationSlug, projectSlug, currentOrganization, currentProject } =
    useProjectScope()
  const trpc = useTRPC()
  const overviewQuery = useQuery(
    trpc.projects.overview.queryOptions({ organizationSlug, projectSlug }),
  )

  if (overviewQuery.isLoading) {
    return <LoadingState label="Loading project overview..." />
  }

  if (!overviewQuery.data) {
    return <LoadingState label="Project overview could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Project overview
          </h1>
          <PageHeaderMeta>
            <span>{currentOrganization?.name ?? organizationSlug}</span>
            <span>/</span>
            <span>{currentProject?.displayName ?? projectSlug}</span>
          </PageHeaderMeta>
        </div>
      </PageHeader>
      <ProgressMetricGrid>
        <ProgressMetric
          label="Records"
          value={overviewQuery.data.metrics.recordCount}
        />
        <ProgressMetric
          label="Tasks"
          value={overviewQuery.data.metrics.taskCount}
        />
        <ProgressMetric
          label="Task records"
          value={overviewQuery.data.metrics.taskRecordCount}
        />
        <ProgressMetric
          label="Active runs"
          value={overviewQuery.data.activeRunCount}
        />
      </ProgressMetricGrid>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Recent tasks
            </h2>
            <p className="text-sm text-muted-foreground">
              Queue summary derived from persisted task-record states.
            </p>
          </SectionCardHeader>
          <SectionCardContent className="flex flex-col gap-3">
            {overviewQuery.data.recentTasks.length > 0 ? (
              overviewQuery.data.recentTasks.map((task) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-4"
                  key={task.id}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {task.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Updated {task.updatedAt.toLocaleString()}
                    </span>
                  </div>
                  <TaskStatusBadge state={task.summaryState} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No tasks exist in this project yet.
              </p>
            )}
          </SectionCardContent>
        </SectionCard>
        <SectionCard>
          <SectionCardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Recent activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Phase 3 activity foundation from persisted task and record
              updates.
            </p>
          </SectionCardHeader>
          <SectionCardContent>
            <ActivityTimeline>
              {overviewQuery.data.recentActivity.map((item) => (
                <ActivityTimelineItem
                  description={item.type}
                  key={`${item.type}-${item.id}`}
                  label={item.label}
                  timestamp={item.timestamp.toLocaleString()}
                />
              ))}
            </ActivityTimeline>
          </SectionCardContent>
        </SectionCard>
      </div>
    </div>
  )
}
