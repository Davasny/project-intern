"use client"

import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { RecordForm } from "@/features/records/components/record-form"
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
  const recordQuery = useQuery(
    trpc.records.getById.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )

  if (activeSchemaQuery.isLoading || recordQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading record...</p>
  }

  if (!activeSchemaQuery.data || !recordQuery.data) {
    return (
      <p className="text-sm text-red-600">
        Record details could not be loaded.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {recordQuery.data.name}
          </h1>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {recordQuery.data.state}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              record version {recordQuery.data.version}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              schema version {recordQuery.data.schemaVersion}
            </span>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Record editor</h2>
            <p className="text-sm text-slate-500">
              Updates are validated against the active schema version before
              they are saved.
            </p>
          </div>
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
        </div>
      </Card>
    </div>
  )
}
