"use client"

import { useQuery } from "@tanstack/react-query"
import { DataTable } from "@/components/ui/data-table/data-table"
import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { MetadataList } from "@/components/ui/metadata-list/metadata-list"
import { MetadataListItem } from "@/components/ui/metadata-list/metadata-list-item"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { ProgressMetric } from "@/components/ui/progress-metric/progress-metric"
import { ProgressMetricGrid } from "@/components/ui/progress-metric/progress-metric-grid"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { RecordStatusBadge } from "@/components/ui/status-badge/record-status-badge"
import { RunStatusBadge } from "@/components/ui/status-badge/run-status-badge"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RecordFilePanel } from "@/features/files/components/record-file-panel"
import { RecordRelationsSection } from "@/features/record-edges/components/record-relations-section"
import { RecordForm } from "@/features/records/components/record-form"
import { RecordLinkedTaskRow } from "@/features/records/components/record-linked-task-row"
import { useTRPC } from "@/lib/trpc/client"

type RecordDetailsPageProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const RecordDetailsPage = ({
  organizationSlug,
  projectSlug,
  recordId,
}: RecordDetailsPageProps) => {
  const trpc = useTRPC()
  const recordQuery = useQuery({
    ...trpc.records.getById.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
    refetchInterval: (query) => {
      const record = query.state.data
      return record && record.progress.inProgressCount > 0 ? 3000 : false
    },
  })
  const recordSchemaQuery = useQuery({
    ...trpc.projectSchema.getByVersion.queryOptions({
      organizationSlug,
      projectSlug,
      version: recordQuery.data?.schemaVersion ?? 1,
    }),
    enabled: recordQuery.data !== undefined,
  })

  const nextWaitingSortOrder =
    recordQuery.data?.linkedTasks
      .filter((t) => t.state === "waiting")
      .map((t) => t.sortOrder)
      .sort((a, b) => a - b)[0] ?? null

  if (recordQuery.isLoading || recordSchemaQuery.isLoading) {
    return <LoadingState label="Loading record..." />
  }

  if (!recordQuery.data || !recordSchemaQuery.data) {
    return <LoadingState label="Record details could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {recordQuery.data.name}
            </h1>
            <RecordStatusBadge state={recordQuery.data.state} />
            {recordQuery.data.activeRunSummary ? (
              <RunStatusBadge state={recordQuery.data.activeRunSummary.state} />
            ) : null}
          </div>
        </div>
      </PageHeader>
      <ProgressMetricGrid>
        <ProgressMetric
          label="Waiting tasks"
          value={recordQuery.data.progress.waitingCount}
        />
        <ProgressMetric
          label="Active tasks"
          value={recordQuery.data.progress.inProgressCount}
        />
        <ProgressMetric
          label="Completed tasks"
          value={recordQuery.data.progress.completedCount}
        />
        <ProgressMetric
          label="Failed tasks"
          value={recordQuery.data.progress.failedCount}
        />
      </ProgressMetricGrid>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Record metadata
          </h2>
          <p className="text-sm text-muted-foreground">
            Canonical record envelope and live task linkage summary.
          </p>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-6">
          <MetadataList>
            <MetadataListItem
              label="Record version"
              value={String(recordQuery.data.version)}
            />
            <MetadataListItem
              label="Schema version"
              value={String(recordQuery.data.schemaVersion)}
            />
            <MetadataListItem
              label="Created"
              value={recordQuery.data.createdAt.toLocaleString()}
            />
            <MetadataListItem
              label="Updated"
              value={recordQuery.data.updatedAt.toLocaleString()}
            />
          </MetadataList>
          <JsonViewer value={recordQuery.data.context} />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Record editor
          </h2>
          <p className="text-sm text-muted-foreground">
            Updates are validated against this record's current schema version
            before they are saved.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <RecordForm
            initialContext={recordQuery.data.context}
            initialName={recordQuery.data.name}
            key={`${recordQuery.data.id}-${recordQuery.data.version}`}
            onSubmitted={() => {}}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            recordId={recordQuery.data.id}
            recordVersion={recordQuery.data.version}
            schemaDefinition={recordSchemaQuery.data.schemaDefinition}
          />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Linked tasks
          </h2>
          <p className="text-sm text-muted-foreground">
            Persisted task-record and latest agent-run state for this record.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader>Task</TableHeader>
                <TableHeader>Task record</TableHeader>
                <TableHeader>Latest run</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recordQuery.data.linkedTasks
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((task) => (
                  <RecordLinkedTaskRow
                    key={task.taskRecordId}
                    nextWaitingSortOrder={nextWaitingSortOrder}
                    organizationSlug={organizationSlug}
                    projectSlug={projectSlug}
                    recordId={recordQuery.data.id}
                    task={task}
                  />
                ))}
            </TableBody>
          </DataTable>
        </SectionCardContent>
      </SectionCard>
      <RecordFilePanel
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordQuery.data.id}
      />
      <RecordRelationsSection
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordQuery.data.id}
      />
    </div>
  )
}
