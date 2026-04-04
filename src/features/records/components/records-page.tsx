"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableEmptyState } from "@/components/ui/data-table/data-table-empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FilterBar } from "@/components/ui/filter-bar/filter-bar"
import { FilterBarActions } from "@/components/ui/filter-bar/filter-bar-actions"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { RecordForm } from "@/features/records/components/record-form"
import { RecordListRow } from "@/features/records/components/record-list-row"
import { useTRPC } from "@/lib/trpc/client"

export const RecordsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const initialSchemaQuery = useQuery(
    trpc.projectSchema.getByVersion.queryOptions({
      organizationSlug,
      projectSlug,
      version: 1,
    }),
  )
  const recordsQuery = useQuery(
    trpc.records.list.queryOptions({ organizationSlug, projectSlug }),
  )

  if (initialSchemaQuery.isLoading || recordsQuery.isLoading) {
    return <LoadingState label="Loading records..." />
  }

  if (!initialSchemaQuery.data) {
    return <LoadingState label="Initial schema could not be loaded." />
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Records
            </h1>
            <p className="text-sm text-muted-foreground">
              New records always start at schema version{" "}
              {initialSchemaQuery.data.version}.
              {initialSchemaQuery.data.version === 1
                ? " Once records exist, schema changes will create new versions."
                : " Records are migrated to new schema versions automatically."}
            </p>
          </div>
          <PageHeaderActions>
            <Button onClick={() => setIsCreateOpen(true)} type="button">
              New record
            </Button>
          </PageHeaderActions>
        </PageHeader>
        <FilterBar>
          <div className="text-sm text-muted-foreground">
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
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader>Record</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Completed</TableHeader>
                <TableHeader>Active</TableHeader>
                <TableHeader>Failed</TableHeader>
                <TableHeader>Waiting</TableHeader>
                <TableHeader>Latest run</TableHeader>
                <TableHeader>Relations</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recordsQuery.data.map((record) => (
                <RecordListRow key={record.id} record={record} />
              ))}
            </TableBody>
          </DataTable>
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
      <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create record</DialogTitle>
            <DialogDescription>
              Record creation starts at schema v1 and backfills the full task
              timeline.
            </DialogDescription>
          </DialogHeader>
          <RecordForm
            initialContext={{}}
            initialName=""
            key={initialSchemaQuery.data.id}
            onSubmitted={() => setIsCreateOpen(false)}
            recordId={null}
            recordVersion={null}
            schemaDefinition={initialSchemaQuery.data.schemaDefinition}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
