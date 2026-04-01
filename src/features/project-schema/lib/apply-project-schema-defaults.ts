import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

export const applyProjectSchemaDefaults = (
  schemaDefinition: ProjectSchemaDefinition,
  context: Record<string, unknown>,
) => {
  const nextContext = { ...context }

  for (const field of schemaDefinition.fields) {
    if (field.isSystem || field.defaultValue === null) {
      continue
    }

    if (nextContext[field.key] === undefined) {
      nextContext[field.key] = field.defaultValue
    }
  }

  return nextContext
}
