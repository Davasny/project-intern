"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { formatActivityLogEntry } from "@/features/observability/lib/format-activity-log-entry"
import { SchemaDiffModal } from "@/features/project-schema/components/schema-diff-modal"
import { SchemaVersionFieldItem } from "@/features/project-schema/components/schema-version-field-item"
import { SchemaVersionForm } from "@/features/project-schema/components/schema-version-form"
import { SchemaVersionHistoryItem } from "@/features/project-schema/components/schema-version-history-item"
import { useTRPC } from "@/lib/trpc/client"

type SchemaVersionBrowserProps = {
  organizationSlug: string
  projectSlug: string
}

export const SchemaVersionBrowser = ({
  organizationSlug,
  projectSlug,
}: SchemaVersionBrowserProps) => {
  const trpc = useTRPC()
  const [selectedDiffVersionId, setSelectedDiffVersionId] = useState<
    string | null
  >(null)
  const settingsQuery = useQuery(
    trpc.projectSchema.getSettings.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  if (settingsQuery.isLoading) {
    return <LoadingState label="Loading schema settings..." />
  }

  if (!settingsQuery.data?.activeVersion) {
    return <LoadingState label="Schema settings could not be loaded." />
  }

  const selectedPreviousVersion = settingsQuery.data.versions.find(
    (version) => version.id === selectedDiffVersionId,
  )
  const activeMigration = settingsQuery.data.versions.find(
    (version) => version.isActive,
  )
  const activeVersion = settingsQuery.data.activeVersion
  const taskHrefBase = `/app/${organizationSlug}/${projectSlug}/tasks`

  if (!activeVersion) {
    return <LoadingState label="Schema settings could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Schema settings
          </h1>
          <p className="text-sm text-slate-600">
            Active schema version {activeVersion.version} governs all record
            validation and migration status.
          </p>
        </div>
      </PageHeader>
      <ProgressMetricGrid>
        <ProgressMetric
          label="Records"
          value={settingsQuery.data.totalRecordCount}
        />
        <ProgressMetric
          label="Affected"
          value={activeMigration?.migration.affectedRecordCount ?? 0}
        />
        <ProgressMetric
          label="Pending"
          value={activeMigration?.migration.pendingRecordCount ?? 0}
        />
        <ProgressMetric
          label="Completed"
          value={activeMigration?.migration.completedCount ?? 0}
        />
      </ProgressMetricGrid>
      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Active schema fields</h2>
            <p className="text-sm text-slate-500">
              System fields are always present. Custom fields define runtime
              record context.
            </p>
          </div>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-4">
          {settingsQuery.data.activeVersion.schemaDefinition.fields.map(
            (field) => (
              <SchemaVersionFieldItem field={field} key={field.key} />
            ),
          )}
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Schema version history</h2>
            <p className="text-sm text-slate-500">
              Compare any prior version with the active version in the diff
              modal.
            </p>
          </div>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-4">
          {settingsQuery.data.versions.length > 0 ? (
            settingsQuery.data.versions.map((version) => (
              <SchemaVersionHistoryItem
                canCompare={version.id !== activeVersion.id}
                isActive={version.id === activeVersion.id}
                key={version.id}
                onCompare={() => setSelectedDiffVersionId(version.id)}
                taskHrefBase={taskHrefBase}
                version={version}
              />
            ))
          ) : (
            <p className="text-sm text-slate-500">No schema versions found.</p>
          )}
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Latest schema activity</h2>
            <p className="text-sm text-slate-500">
              Recent schema version, migration, and migration-task events.
            </p>
          </div>
        </SectionCardHeader>
        <SectionCardContent>
          <ActivityTimeline>
            {settingsQuery.data.latestSchemaActivity.map((event) => (
              <ActivityTimelineItem
                description={
                  formatActivityLogEntry({
                    createdAt: event.createdAt,
                    eventType: event.eventType,
                    payload: event.payload,
                    recordName: null,
                    taskTitle: event.taskTitle,
                  }).description
                }
                key={event.id}
                label={
                  formatActivityLogEntry({
                    createdAt: event.createdAt,
                    eventType: event.eventType,
                    payload: event.payload,
                    recordName: null,
                    taskTitle: event.taskTitle,
                  }).label
                }
                timestamp={event.createdAt.toLocaleString()}
              />
            ))}
          </ActivityTimeline>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardContent>
          <SchemaVersionForm
            initialSchemaDefinition={activeVersion.schemaDefinition}
            key={activeVersion.id}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        </SectionCardContent>
      </SectionCard>
      {selectedPreviousVersion ? (
        <SchemaDiffModal
          nextVersionId={activeVersion.id}
          onClose={() => setSelectedDiffVersionId(null)}
          organizationSlug={organizationSlug}
          previousVersionId={selectedPreviousVersion.id}
          projectSlug={projectSlug}
        />
      ) : null}
    </div>
  )
}
