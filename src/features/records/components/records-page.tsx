"use client"

import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
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
    return <p className="text-sm text-slate-500">Loading records...</p>
  }

  if (!activeSchemaQuery.data) {
    return (
      <p className="text-sm text-red-600">Active schema could not be loaded.</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
          <p className="text-sm text-slate-600">
            Create and edit canonical project records against schema version{" "}
            {activeSchemaQuery.data.version}.
          </p>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Create record</h2>
            <p className="text-sm text-slate-500">
              Custom context fields are validated against the active project
              schema.
            </p>
          </div>
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
        </div>
      </Card>
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Record list</h2>
        {recordsQuery.data && recordsQuery.data.length > 0 ? (
          recordsQuery.data.map((record) => (
            <RecordListItem
              key={record.id}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              record={record}
            />
          ))
        ) : (
          <Card className="p-6 text-sm text-slate-500">
            No records exist yet for this project.
          </Card>
        )}
      </div>
    </div>
  )
}
