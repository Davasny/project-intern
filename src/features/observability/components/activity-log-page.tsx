"use client"

import { useQuery } from "@tanstack/react-query"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { ActivityLogItem } from "@/features/observability/components/activity-log-item"
import { useTRPC } from "@/lib/trpc/client"

type ActivityLogPageProps = {
  organizationSlug: string
  projectSlug: string
}

export const ActivityLogPage = ({
  organizationSlug,
  projectSlug,
}: ActivityLogPageProps) => {
  const trpc = useTRPC()
  const activityQuery = useQuery(
    trpc.observability.listActivityLogEvents.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  if (activityQuery.isLoading) {
    return <LoadingState label="Loading activity log..." />
  }

  if (!activityQuery.data) {
    return <LoadingState label="Activity log could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Activity log
          </h1>
          <p className="text-sm text-slate-500">
            Auditable runtime history for schema, task, and execution events.
          </p>
        </div>
      </PageHeader>
      <ProgressMetricGrid>
        <ProgressMetric label="Events" value={activityQuery.data.length} />
        <ProgressMetric
          label="Failures"
          value={
            activityQuery.data.filter((event) =>
              event.eventType.includes("failed"),
            ).length
          }
        />
        <ProgressMetric
          label="Completions"
          value={
            activityQuery.data.filter((event) =>
              event.eventType.includes("completed"),
            ).length
          }
        />
      </ProgressMetricGrid>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-slate-950">Timeline</h2>
          <p className="text-sm text-slate-500">
            Persisted activity only. No frontend-invented status entries.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <ActivityTimeline>
            {activityQuery.data.map((event) => (
              <ActivityLogItem event={event} key={event.id} />
            ))}
          </ActivityTimeline>
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
