import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { PageHeaderMeta } from "@/components/ui/page-header/page-header-meta"
import { CollapseSchemaHistoryButton } from "@/features/project-schema/components/collapse-schema-history-button"
import { CreateSchemaVersionModal } from "@/features/project-schema/components/create-schema-version-modal"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

type SchemaSettingsHeaderProps = {
  activeVersionNumber: number
  initialSchemaDefinition: ProjectSchemaDefinition
  totalRecordCount: number
  versionCount: number
}

export const SchemaSettingsHeader = ({
  activeVersionNumber,
  initialSchemaDefinition,
  totalRecordCount,
  versionCount,
}: SchemaSettingsHeaderProps) => (
  <PageHeader className="gap-3">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Schema settings
        </h1>
        <PageHeaderMeta>
          <span>Active schema v{activeVersionNumber}</span>
          <span>•</span>
          <span>{totalRecordCount.toLocaleString()} records</span>
          <span>•</span>
          <span>{versionCount.toLocaleString()} versions</span>
        </PageHeaderMeta>
      </div>
      <PageHeaderActions className="md:justify-end">
        <CollapseSchemaHistoryButton
          totalRecordCount={totalRecordCount}
          versionCount={versionCount}
        />
        <CreateSchemaVersionModal
          initialSchemaDefinition={initialSchemaDefinition}
          totalRecordCount={totalRecordCount}
        />
      </PageHeaderActions>
    </div>
  </PageHeader>
)
