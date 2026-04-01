"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTableEmptyState } from "@/components/ui/data-table/data-table-empty-state"
import { FilterBar } from "@/components/ui/filter-bar/filter-bar"
import { FilterBarActions } from "@/components/ui/filter-bar/filter-bar-actions"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { SidePanel } from "@/components/ui/side-panel/side-panel"
import { SidePanelHeader } from "@/components/ui/side-panel/side-panel-header"
import { RecordForm } from "@/features/records/components/record-form"
import { RecordListItem } from "@/features/records/components/record-list-item"
import { useTRPC } from "@/lib/trpc/client"

type RecordsPageProps = {
  organizationSlug: string
  projectSlug: string
}

export const RecordsPage = ({
  organizationSlug,
  projectSlug,
}: RecordsPageProps) => {
  const trpc = useTRPC()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const activeSchemaQuery = useQuery(
    trpc.projectSchema.getActive.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )
  const recordsQuery = useQuery(
    trpc.records.list.queryOptions({ organizationSlug, projectSlug }),
  )

  if (activeSchemaQuery.isLoading || recordsQuery.isLoading) {
    return <LoadingState label="Loading records..." />
  }

  if (!activeSchemaQuery.data) {
    return <LoadingState label="Active schema could not be loaded." />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <PageHeader>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Records
            </h1>
            <p className="text-sm text-slate-500">
              Canonical project records validated against schema version{" "}
              {activeSchemaQuery.data.version}.
            </p>
          </div>
          <PageHeaderActions>
            <Button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              type="button"
            >
              {isCreateOpen ? "Hide record panel" : "New record"}
            </Button>
          </PageHeaderActions>
        </PageHeader>
        <FilterBar>
          <div className="text-sm text-slate-500">
            {recordsQuery.data ? recordsQuery.data.length : 0} records in this
            project.
          </div>
          <FilterBarActions>
            <Button
              onClick={() => setIsCreateOpen(true)}
              type="button"
              variant="secondary"
            >
              Create record
            </Button>
          </FilterBarActions>
        </FilterBar>
        {recordsQuery.data && recordsQuery.data.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recordsQuery.data.map((record) => (
              <RecordListItem
                key={record.id}
                organizationSlug={organizationSlug}
                projectSlug={projectSlug}
                record={record}
              />
            ))}
          </div>
        ) : (
          <DataTableEmptyState
            action={
              <Button onClick={() => setIsCreateOpen(true)} type="button">
                Create first record
              </Button>
            }
            description="New records automatically backfill task-record rows for all existing project tasks."
            title="No records yet"
          />
        )}
      </div>
      {isCreateOpen ? (
        <SidePanel>
          <SidePanelHeader>
            <h2 className="text-lg font-semibold text-slate-950">
              Create record
            </h2>
            <p className="text-sm text-slate-500">
              Record creation backfills missing task-record rows across the
              project queue.
            </p>
          </SidePanelHeader>
          <RecordForm
            initialContext={{}}
            initialName=""
            key={activeSchemaQuery.data.id}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            recordId={null}
            recordVersion={null}
            schemaDefinition={activeSchemaQuery.data.schemaDefinition}
          />
        </SidePanel>
      ) : (
        <div />
      )}
    </div>
  )
}
