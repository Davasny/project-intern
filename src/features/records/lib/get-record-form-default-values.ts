import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { formatRecordContextFormValue } from "@/features/records/lib/format-record-context-form-value"

type GetRecordFormDefaultValuesParams = {
  context: Record<string, unknown>
  name: string
  schemaDefinition: ProjectSchemaDefinition
}

export const getRecordFormDefaultValues = ({
  context,
  name,
  schemaDefinition,
}: GetRecordFormDefaultValuesParams) => {
  const defaultContextValues = Object.fromEntries(
    schemaDefinition.fields
      .filter((field) => !field.isSystem)
      .map((field) => {
        const contextValue = context[field.key] ?? field.defaultValue
        return [
          field.key,
          formatRecordContextFormValue({ field, value: contextValue }),
        ]
      }),
  )

  return {
    context: defaultContextValues,
    name,
  }
}
