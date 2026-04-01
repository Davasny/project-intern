"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Card } from "@/components/ui/card"
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
  const activeSchemaQuery = useQuery(
    trpc.projectSchema.getActive.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )
  const versionsQuery = useQuery(
    trpc.projectSchema.listVersions.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  if (activeSchemaQuery.isLoading || versionsQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading schema settings...</p>
  }

  if (!activeSchemaQuery.data) {
    return (
      <p className="text-sm text-red-600">
        Schema settings could not be loaded.
      </p>
    )
  }

  const selectedPreviousVersion = versionsQuery.data?.find(
    (version) => version.id === selectedDiffVersionId,
  )

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Schema settings
          </h1>
          <p className="text-sm text-slate-600">
            Active schema version {activeSchemaQuery.data.version} governs all
            record validation.
          </p>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Active schema fields</h2>
            <p className="text-sm text-slate-500">
              System fields are always present. Custom fields define runtime
              record context.
            </p>
          </div>
          {activeSchemaQuery.data.schemaDefinition.fields.map((field) => (
            <SchemaVersionFieldItem field={field} key={field.key} />
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Schema version history</h2>
            <p className="text-sm text-slate-500">
              Compare any prior version with the active version in the diff
              modal.
            </p>
          </div>
          {versionsQuery.data && versionsQuery.data.length > 0 ? (
            versionsQuery.data.map((version) => (
              <SchemaVersionHistoryItem
                canCompare={version.id !== activeSchemaQuery.data.id}
                isActive={version.id === activeSchemaQuery.data.id}
                key={version.id}
                onCompare={() => setSelectedDiffVersionId(version.id)}
                version={{ id: version.id, version: version.version }}
              />
            ))
          ) : (
            <p className="text-sm text-slate-500">No schema versions found.</p>
          )}
        </div>
      </Card>
      <Card className="p-6">
        <SchemaVersionForm
          initialSchemaDefinition={activeSchemaQuery.data.schemaDefinition}
          key={activeSchemaQuery.data.id}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      </Card>
      {selectedPreviousVersion ? (
        <SchemaDiffModal
          nextVersionId={activeSchemaQuery.data.id}
          onClose={() => setSelectedDiffVersionId(null)}
          organizationSlug={organizationSlug}
          previousVersionId={selectedPreviousVersion.id}
          projectSlug={projectSlug}
        />
      ) : null}
    </div>
  )
}
