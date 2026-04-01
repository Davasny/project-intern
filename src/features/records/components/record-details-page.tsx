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
  const activeSchemaQuery = useQuery(
    trpc.projectSchema.getActive.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )
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

  if (activeSchemaQuery.isLoading || recordQuery.isLoading) {
    return <LoadingState label="Loading record..." />
  }

  if (!activeSchemaQuery.data || !recordQuery.data) {
    return <LoadingState label="Record details could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
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
          <h2 className="text-lg font-semibold text-slate-950">
            Record metadata
          </h2>
          <p className="text-sm text-slate-500">
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
          <h2 className="text-lg font-semibold text-slate-950">
            Record editor
          </h2>
          <p className="text-sm text-slate-500">
            Updates are validated against the active schema version before they
            are saved.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <RecordForm
            initialContext={recordQuery.data.context}
            initialName={recordQuery.data.name}
            key={`${recordQuery.data.id}-${recordQuery.data.version}`}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            recordId={recordQuery.data.id}
            recordVersion={recordQuery.data.version}
            schemaDefinition={activeSchemaQuery.data.schemaDefinition}
          />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-slate-950">Linked tasks</h2>
          <p className="text-sm text-slate-500">
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
              </TableRow>
            </TableHead>
            <TableBody>
              {recordQuery.data.linkedTasks.map((task) => (
                <RecordLinkedTaskRow
                  key={task.taskRecordId}
                  organizationSlug={organizationSlug}
                  projectSlug={projectSlug}
                  task={task}
                />
              ))}
            </TableBody>
          </DataTable>
        </SectionCardContent>
      </SectionCard>
      <RecordRelationsSection
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordQuery.data.id}
      />
    </div>
  )
}
