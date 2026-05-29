import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"
import { isRecordJsonTextareaField } from "@/features/records/lib/is-record-json-textarea-field"

export const formatRecordContextFormValue = ({
  field,
  value,
}: {
  field: ProjectSchemaField
  value: unknown
}) => {
  if (field.type === "boolean") {
    return typeof value === "boolean" ? value : false
  }

  if (isRecordJsonTextareaField(field)) {
    if (value === undefined || value === null) {
      return ""
    }

    return JSON.stringify(value, null, 2)
  }

  if (field.type === "number") {
    return value ?? ""
  }

  return typeof value === "string" ? value : ""
}
