"use client"

import { useQuery } from "@tanstack/react-query"
import { DatabaseIcon } from "lucide-react"
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
import { ErrorState } from "@/components/ui/error-state/error-state"
import { FilterBar } from "@/components/ui/filter-bar/filter-bar"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { Switch } from "@/components/ui/switch"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { RecordCsvImportDialog } from "@/features/records/components/record-csv-import-dialog"
import { RecordForm } from "@/features/records/components/record-form"
import { RecordListRow } from "@/features/records/components/record-list-row"
import { useTRPC } from "@/lib/trpc/client"

export const RecordsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [showContextValues, setShowContextValues] = useState(false)
  const initialSchemaQuery = useQuery(
    trpc.projectSchema.getByVersion.queryOptions({
      organizationSlug,
      projectSlug,
      version: 1,
    }),
  )
  const activeSchemaQuery = useQuery(
    trpc.projectSchema.getActive.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )
  const recordsQuery = useQuery(
    trpc.records.list.queryOptions({ organizationSlug, projectSlug }),
  )

  if (
    initialSchemaQuery.isLoading ||
    activeSchemaQuery.isLoading ||
    recordsQuery.isLoading
  ) {
    return <LoadingState label="Loading records..." variant="table" />
  }

  if (!initialSchemaQuery.data || !activeSchemaQuery.data) {
    return (
      <ErrorState
        message="The schema could not be loaded. Please try again."
        title="Failed to load schema"
      />
    )
  }

  if (!recordsQuery.data) {
    return (
      <ErrorState
        message="Records could not be loaded. Please try again."
        title="Failed to load records"
      />
    )
  }

  const contextColumns = activeSchemaQuery.data.schemaDefinition.fields.filter(
    (field) => !field.isSystem,
  )

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
            <Button
              onClick={() => setIsImportOpen(true)}
              type="button"
              variant="outline"
            >
              Import CSV
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} type="button">
              New record
            </Button>
          </PageHeaderActions>
        </PageHeader>
        <FilterBar>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                {showContextValues
                  ? "Hide context values"
                  : "Show context values"}
              </span>
              <Switch
                checked={showContextValues}
                onCheckedChange={setShowContextValues}
              />
            </div>
          </div>

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
                {showContextValues
                  ? contextColumns.map((field) => (
                      <TableHeader key={field.key}>{field.label}</TableHeader>
                    ))
                  : null}
                <TableHeader>Updated</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recordsQuery.data.map((record) => (
                <RecordListRow
                  contextColumns={contextColumns}
                  key={record.id}
                  record={record}
                  showContextValues={showContextValues}
                />
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
            description="New records start inactive. Activate them to begin task processing."
            icon={<DatabaseIcon />}
            title="No records yet"
          />
        )}
      </div>
      <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create record</DialogTitle>
            <DialogDescription>
              New records start inactive. Activate them from the record detail
              page to begin task processing.
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
      <RecordCsvImportDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </>
  )
}
