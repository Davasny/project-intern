import type { FieldArrayWithId, UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SchemaFieldTableRow } from "@/features/project-schema/components/schema-field-table-row"
import type { SchemaVersionFormValues } from "@/features/project-schema/schemas/schema-version-form-schema"

type SchemaFieldTableProps = {
  fields: Array<FieldArrayWithId<SchemaVersionFormValues, "fields", "id">>
  form: UseFormReturn<SchemaVersionFormValues>
  onAddField: () => void
  onRemoveField: (index: number) => void
}

export const SchemaFieldTable = ({
  fields,
  form,
  onAddField,
  onRemoveField,
}: SchemaFieldTableProps) => (
  <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Custom fields</h3>
        <p className="text-xs text-muted-foreground">
          Add or edit runtime fields. System fields stay included automatically.
        </p>
      </div>
      <Button onClick={onAddField} type="button" variant="secondary">
        Add field
      </Button>
    </div>
    {fields.length > 0 ? (
      <div className="min-h-0 overflow-auto">
        <Table className="min-w-[900px]">
          <TableHead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <TableRow>
              <TableHeader className="px-3 py-2">Label</TableHeader>
              <TableHeader className="px-3 py-2">Key</TableHeader>
              <TableHeader className="px-3 py-2">Type</TableHeader>
              <TableHeader className="px-3 py-2 text-center">Req.</TableHeader>
              <TableHeader className="px-3 py-2">Details</TableHeader>
              <TableHeader className="px-3 py-2 text-right">Remove</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((field, index) => (
              <SchemaFieldTableRow
                form={form}
                index={index}
                key={field.id}
                onRemove={() => onRemoveField(index)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      <div className="flex flex-col gap-2 px-4 py-8 text-sm text-muted-foreground">
        <p>No custom fields yet.</p>
        <p>Use Add field to create one. System fields are always included.</p>
      </div>
    )}
  </div>
)
