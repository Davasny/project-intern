import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { isRecordJsonTextareaField } from "@/features/records/lib/is-record-json-textarea-field"
import { parseRecordJsonTextareaValue } from "@/features/records/lib/parse-record-json-textarea-value"

type BuildRecordContextPayloadParams = {
  rawContext: Record<string, unknown>
  schemaDefinition: ProjectSchemaDefinition
}

export const buildRecordContextPayload = ({
  rawContext,
  schemaDefinition,
}: BuildRecordContextPayloadParams) =>
  Object.fromEntries(
    schemaDefinition.fields
      .filter((field) => !field.isSystem)
      .map((field) => {
        const rawValue = rawContext[field.key]

        if (field.type === "number") {
          if (rawValue === "") {
            return [field.key, null]
          }

          if (typeof rawValue === "number") {
            return [field.key, rawValue]
          }

          return [field.key, Number(rawValue)]
        }

        if (field.type === "boolean") {
          return [field.key, rawValue === true]
        }

        if (isRecordJsonTextareaField(field)) {
          return [field.key, parseRecordJsonTextareaValue(rawValue)]
        }

        if (typeof rawValue === "string") {
          const trimmedValue = rawValue.trim()
          return [field.key, trimmedValue ? trimmedValue : null]
        }

        return [field.key, rawValue ?? null]
      }),
  )
