import type { ProjectSchemaFieldType } from "@/features/project-schema/schemas/project-schema-field"

const parseJsonDefaultValue = (value: string): unknown => JSON.parse(value)

export const parseProjectSchemaDefaultValue = ({
  type,
  value,
}: {
  type: ProjectSchemaFieldType
  value: string
}) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  if (type === "number") {
    return Number(trimmedValue)
  }

  if (type === "boolean") {
    return trimmedValue === "true"
  }

  if (type === "json" || type === "string_array" || type === "number_array") {
    return parseJsonDefaultValue(trimmedValue)
  }

  return trimmedValue
}
