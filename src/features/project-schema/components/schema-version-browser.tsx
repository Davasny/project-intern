"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { SchemaActiveFieldsSection } from "@/features/project-schema/components/schema-active-fields-section"
import { SchemaDiffModal } from "@/features/project-schema/components/schema-diff-modal"
import { SchemaHistorySection } from "@/features/project-schema/components/schema-history-section"
import { SchemaMigrationProgressStrip } from "@/features/project-schema/components/schema-migration-progress-strip"
import { SchemaProposalsSection } from "@/features/project-schema/components/schema-proposals-section"
import { SchemaSettingsHeader } from "@/features/project-schema/components/schema-settings-header"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const SchemaVersionBrowser = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [selectedDiffVersionId, setSelectedDiffVersionId] = useState<
    string | null
  >(null)
  const [isVersionsExpanded, setIsVersionsExpanded] = useState(false)
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
      <SchemaSettingsHeader
        activeVersionNumber={activeVersion.version}
        initialSchemaDefinition={activeVersion.schemaDefinition}
        totalRecordCount={settingsQuery.data.totalRecordCount}
        versionCount={settingsQuery.data.versions.length}
      />

      <SchemaMigrationProgressStrip
        affectedRecordCount={activeMigration?.migration.affectedRecordCount ?? 0}
        completedCount={activeMigration?.migration.completedCount ?? 0}
        pendingRecordCount={activeMigration?.migration.pendingRecordCount ?? 0}
        totalRecordCount={settingsQuery.data.totalRecordCount}
      />

      <SchemaActiveFieldsSection fields={activeVersion.schemaDefinition.fields} />

      <SchemaProposalsSection
        onCompare={setSelectedDiffVersionId}
        proposals={settingsQuery.data.pendingProposals}
      />

      <SchemaHistorySection
        activeVersionId={activeVersion.id}
        isExpanded={isVersionsExpanded}
        onCompare={setSelectedDiffVersionId}
        onToggle={() => setIsVersionsExpanded(!isVersionsExpanded)}
        taskHrefBase={taskHrefBase}
        versions={settingsQuery.data.versions}
      />

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
