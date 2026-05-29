import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { RecordForm } from "@/features/records/components/record-form"

type RecordPrimarySectionProps = {
  context: Record<string, unknown>
  name: string
  recordId: string
  schemaDefinition: ProjectSchemaDefinition
  version: number
}

export const RecordPrimarySection = ({
  context,
  name,
  recordId,
  schemaDefinition,
  version,
}: RecordPrimarySectionProps) => (
  <SectionCard className="gap-4">
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Edit record</h2>
    </SectionCardHeader>
    <SectionCardContent>
      <RecordForm
        initialContext={context}
        initialName={name}
        key={`${recordId}-${version}`}
        onSubmitted={() => {}}
        recordId={recordId}
        recordVersion={version}
        schemaDefinition={schemaDefinition}
      />
    </SectionCardContent>
  </SectionCard>
)
