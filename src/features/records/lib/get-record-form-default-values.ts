import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

type GetRecordFormDefaultValuesParams = {
  context: Record<string, unknown>
  name: string
  schemaDefinition: ProjectSchemaDefinition
}

const getJsonFieldValue = (value: unknown) => {
  if (value === undefined || value === null) {
    return ""
  }

  return JSON.stringify(value, null, 2)
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

        if (field.type === "boolean") {
          return [
            field.key,
            typeof contextValue === "boolean" ? contextValue : false,
          ]
        }

        if (field.type === "json") {
          return [field.key, getJsonFieldValue(contextValue)]
        }

        if (field.type === "number") {
          return [field.key, contextValue ?? ""]
        }

        return [field.key, typeof contextValue === "string" ? contextValue : ""]
      }),
  )

  return {
    context: defaultContextValues,
    name,
  }
}
