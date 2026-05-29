import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"

export const isRecordJsonTextareaField = (field: ProjectSchemaField) =>
  field.type === "json" ||
  field.type === "string_array" ||
  field.type === "number_array"
