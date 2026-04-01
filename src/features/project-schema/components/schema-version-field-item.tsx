import { Card } from "@/components/ui/card"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"

type SchemaVersionFieldItemProps = {
  field: ProjectSchemaField
}

export const SchemaVersionFieldItem = ({
  field,
}: SchemaVersionFieldItemProps) => (
  <Card className="p-4">
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{field.label}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {field.key}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {field.type}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {field.required ? "required" : "optional"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {field.isSystem ? "system" : "custom"}
        </span>
      </div>
      <p className="text-sm text-slate-600">
        {field.description || "No description."}
      </p>
      <p className="text-xs text-slate-500">
        default:{" "}
        {field.defaultValue === null
          ? "none"
          : JSON.stringify(field.defaultValue)}
      </p>
    </div>
  </Card>
)
