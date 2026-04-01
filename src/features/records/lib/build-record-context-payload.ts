import { TRPCError } from "@trpc/server"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

type BuildRecordContextPayloadParams = {
  rawContext: Record<string, unknown>
  schemaDefinition: ProjectSchemaDefinition
}

const parseJsonString = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    return JSON.parse(trimmedValue)
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "JSON fields must contain valid JSON.",
    })
  }
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

        if (field.type === "json") {
          return [field.key, parseJsonString(rawValue)]
        }

        if (typeof rawValue === "string") {
          const trimmedValue = rawValue.trim()
          return [field.key, trimmedValue ? trimmedValue : null]
        }

        return [field.key, rawValue ?? null]
      }),
  )
