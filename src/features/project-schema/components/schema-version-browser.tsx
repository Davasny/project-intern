"use client"

import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { StatsBar } from "@/components/ui/stats-bar/stats-bar"
import { formatActivityLogEntry } from "@/features/observability/lib/format-activity-log-entry"
import { CollapseSchemaHistoryButton } from "@/features/project-schema/components/collapse-schema-history-button"
import { CreateSchemaVersionModal } from "@/features/project-schema/components/create-schema-version-modal"
import { SchemaDiffModal } from "@/features/project-schema/components/schema-diff-modal"
import { SchemaVersionFieldItem } from "@/features/project-schema/components/schema-version-field-item"
import { SchemaVersionProposalItem } from "@/features/project-schema/components/schema-version-proposal-item"
import { SchemaVersionTimelineItem } from "@/features/project-schema/components/schema-version-timeline-item"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

export const SchemaVersionBrowser = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [selectedDiffVersionId, setSelectedDiffVersionId] = useState<
    string | null
  >(null)
  const [isVersionsExpanded, setIsVersionsExpanded] = useState(false)
  const [isActivityExpanded, setIsActivityExpanded] = useState(false)
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

  const selectedPreviousVersion = [
    ...settingsQuery.data.versions,
    ...settingsQuery.data.pendingProposals,
  ].find((version) => version.id === selectedDiffVersionId)
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
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Schema settings
          </h1>
          <p className="text-sm text-muted-foreground">
            {settingsQuery.data.totalRecordCount === 0
              ? `Schema v${activeVersion.version} is editable in place. Changes apply immediately—no versioning needed while the project is empty.`
              : `Active schema version ${activeVersion.version} governs all record validation and migration status.`}
          </p>
        </div>
      </PageHeader>

      <StatsBar
        stats={[
          { label: "Records", value: settingsQuery.data.totalRecordCount },
          {
            label: "Affected",
            value: activeMigration?.migration.affectedRecordCount ?? 0,
          },
          {
            label: "Pending",
            value: activeMigration?.migration.pendingRecordCount ?? 0,
          },
          {
            label: "Completed",
            value: activeMigration?.migration.completedCount ?? 0,
          },
        ]}
        details={[]}
      />

      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Pending schema proposals</h2>
            <p className="text-sm text-muted-foreground">
              Agent proposals wait in created state until accepted or rejected.
            </p>
          </div>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-1">
          {settingsQuery.data.pendingProposals.length > 0 ? (
            settingsQuery.data.pendingProposals.map((proposal) => (
              <SchemaVersionProposalItem
                key={proposal.id}
                onCompare={() => setSelectedDiffVersionId(proposal.id)}
                proposal={proposal}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No schema proposals are waiting for review.
            </p>
          )}
        </SectionCardContent>
      </SectionCard>

      <SectionCard>
        <SectionCardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Active schema fields</h2>
              <p className="text-sm text-muted-foreground">
                System fields are always present. Custom fields define runtime
                record context.
              </p>
            </div>
            <div className="flex flex-row gap-2">
              <CollapseSchemaHistoryButton
                totalRecordCount={settingsQuery.data.totalRecordCount}
                versionCount={settingsQuery.data.versions.length}
              />
              <CreateSchemaVersionModal
                initialSchemaDefinition={activeVersion.schemaDefinition}
                totalRecordCount={settingsQuery.data.totalRecordCount}
              />
            </div>
          </div>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-2">
          {settingsQuery.data.activeVersion.schemaDefinition.fields.map(
            (field) => (
              <SchemaVersionFieldItem field={field} key={field.key} />
            ),
          )}
        </SectionCardContent>
      </SectionCard>

      <SectionCard>
        <button
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setIsVersionsExpanded(!isVersionsExpanded)}
          type="button"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Schema version history</h2>
            <p className="text-sm text-muted-foreground">
              {settingsQuery.data.versions.length} versions · Compare with
              active version
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isVersionsExpanded && "rotate-180",
            )}
          />
        </button>
        {isVersionsExpanded ? (
          <SectionCardContent className="flex flex-col gap-1 border-t border-border pt-4">
            {settingsQuery.data.versions.length > 0 ? (
              settingsQuery.data.versions.map((version) => (
                <SchemaVersionTimelineItem
                  canCompare={version.id !== activeVersion.id}
                  isActive={version.id === activeVersion.id}
                  key={version.id}
                  onCompare={() => setSelectedDiffVersionId(version.id)}
                  taskHrefBase={taskHrefBase}
                  version={version}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No schema versions found.
              </p>
            )}
          </SectionCardContent>
        ) : null}
      </SectionCard>

      <SectionCard>
        <button
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setIsActivityExpanded(!isActivityExpanded)}
          type="button"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Latest schema activity</h2>
            <p className="text-sm text-muted-foreground">
              Recent schema version, migration, and migration-task events.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isActivityExpanded && "rotate-180",
            )}
          />
        </button>
        {isActivityExpanded ? (
          <SectionCardContent className="border-t border-border pt-4">
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
        ) : null}
      </SectionCard>

      {selectedPreviousVersion ? (
        <SchemaDiffModal
          nextVersionId={activeVersion.id}
          onClose={() => setSelectedDiffVersionId(null)}
          previousVersionId={selectedPreviousVersion.id}
        />
      ) : null}
    </div>
  )
}
