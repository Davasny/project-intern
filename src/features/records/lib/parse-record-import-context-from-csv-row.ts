import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

type ParseRecordImportContextFromCsvRowParams = {
  csvRow: Record<string, string>
  rowNumber: number
  schemaDefinition: ProjectSchemaDefinition
}

const parseBooleanValue = (value: string) => {
  const normalizedValue = value.trim().toLowerCase()

  if (
    normalizedValue === "true" ||
    normalizedValue === "1" ||
    normalizedValue === "yes"
  ) {
    return true
  }

  if (
    normalizedValue === "false" ||
    normalizedValue === "0" ||
    normalizedValue === "no"
  ) {
    return false
  }

  throw new Error(`Expected boolean value, received "${value}".`)
}

const parseNumberValue = (value: string) => {
  const parsedNumber = Number(value)

  if (Number.isNaN(parsedNumber)) {
    throw new Error(`Expected number value, received "${value}".`)
  }

  return parsedNumber
}

const parseJsonValue = (value: string) => {
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new Error("Expected valid JSON value.")
  }
}

const parseValueByFieldType = ({
  fieldType,
  rawValue,
}: {
  fieldType: ProjectSchemaDefinition["fields"][number]["type"]
  rawValue: string
}) => {
  if (fieldType === "number") {
    return parseNumberValue(rawValue)
  }

  if (fieldType === "boolean") {
    return parseBooleanValue(rawValue)
  }

  if (fieldType === "json") {
    return parseJsonValue(rawValue)
  }

  return rawValue
}

export const parseRecordImportContextFromCsvRow = ({
  csvRow,
  rowNumber,
  schemaDefinition,
}: ParseRecordImportContextFromCsvRowParams) => {
  const contextPayload: Record<string, unknown> = {}

  for (const field of schemaDefinition.fields) {
    if (field.isSystem) {
      continue
    }

    const rawValue = csvRow[field.key]

    if (rawValue === undefined) {
      continue
    }

    if (rawValue.trim().length === 0) {
      continue
    }

    try {
      contextPayload[field.key] = parseValueByFieldType({
        fieldType: field.type,
        rawValue,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse field value."

      throw new Error(`Row ${rowNumber}, field "${field.key}": ${message}`)
    }
  }

  return contextPayload
}
