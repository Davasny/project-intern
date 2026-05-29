import { DataTable } from "@/components/ui/data-table/data-table"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SchemaActiveFieldRow } from "@/features/project-schema/components/schema-active-field-row"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"

type SchemaActiveFieldsSectionProps = {
  fields: ProjectSchemaField[]
}

export const SchemaActiveFieldsSection = ({
  fields,
}: SchemaActiveFieldsSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">Active schema fields</h2>
      <p className="text-sm text-muted-foreground">
        System fields are always present. Custom fields define runtime record
        context.
      </p>
    </SectionCardHeader>
    <SectionCardContent>
      <DataTable ariaLabel="Active schema fields">
        <TableHead>
          <TableRow>
            <TableHeader>Field</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Default</TableHeader>
            <TableHeader>Range</TableHeader>
            <TableHeader className="text-right">Details</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field) => (
            <SchemaActiveFieldRow field={field} key={field.key} />
          ))}
        </TableBody>
      </DataTable>
    </SectionCardContent>
  </SectionCard>
)
