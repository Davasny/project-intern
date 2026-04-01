import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

type ProjectSchemaFieldDiff = {
  after: ProjectSchemaField | null
  before: ProjectSchemaField | null
  changeType: "added" | "removed" | "changed"
  key: string
}

const toFieldMap = (schemaDefinition: ProjectSchemaDefinition) =>
  new Map(schemaDefinition.fields.map((field) => [field.key, field]))

const areFieldsEqual = (left: ProjectSchemaField, right: ProjectSchemaField) =>
  JSON.stringify(left) === JSON.stringify(right)

export const diffProjectSchemaVersions = (
  previousSchemaDefinition: ProjectSchemaDefinition,
  nextSchemaDefinition: ProjectSchemaDefinition,
) => {
  const previousFieldMap = toFieldMap(previousSchemaDefinition)
  const nextFieldMap = toFieldMap(nextSchemaDefinition)
  const keys = new Set([...previousFieldMap.keys(), ...nextFieldMap.keys()])
  const diffs: ProjectSchemaFieldDiff[] = []

  for (const key of keys) {
    const previousField = previousFieldMap.get(key) ?? null
    const nextField = nextFieldMap.get(key) ?? null

    if (!previousField && nextField) {
      diffs.push({
        after: nextField,
        before: null,
        changeType: "added",
        key,
      })
      continue
    }

    if (previousField && !nextField) {
      diffs.push({
        after: null,
        before: previousField,
        changeType: "removed",
        key,
      })
      continue
    }

    if (
      previousField &&
      nextField &&
      !areFieldsEqual(previousField, nextField)
    ) {
      diffs.push({
        after: nextField,
        before: previousField,
        changeType: "changed",
        key,
      })
    }
  }

  return diffs
}
