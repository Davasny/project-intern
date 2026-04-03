import { z } from "zod"
import { getSystemProjectSchemaFields } from "@/features/project-schema/lib/get-system-project-schema-fields"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { projectSchemaDefinitionSchema } from "@/features/project-schema/schemas/project-schema-version"

const isSystemFieldSignatureEqual = (
  left: unknown,
  right: unknown,
): boolean => {
  return JSON.stringify(left) === JSON.stringify(right)
}

export const validateProjectSchemaDefinitionFromFullDefinition = (
  schemaDefinitionInput: unknown,
) => {
  const parsedSchemaDefinition = projectSchemaDefinitionSchema.parse(
    schemaDefinitionInput,
  )
  const systemFields = getSystemProjectSchemaFields()
  const parsedSystemFields = parsedSchemaDefinition.fields.filter(
    (field) => field.isSystem,
  )

  if (parsedSystemFields.length !== systemFields.length) {
    throw new z.ZodError([
      {
        code: "custom",
        input: parsedSystemFields,
        message: "System schema fields must be present and unchanged.",
        path: ["fields"],
      },
    ])
  }

  const hasMismatchedSystemField = systemFields.some(
    (systemField, index) =>
      !isSystemFieldSignatureEqual(systemField, parsedSystemFields[index]),
  )

  if (hasMismatchedSystemField) {
    throw new z.ZodError([
      {
        code: "custom",
        input: parsedSystemFields,
        message: "System schema fields must match the canonical definition.",
        path: ["fields"],
      },
    ])
  }

  const customFields = parsedSchemaDefinition.fields.filter(
    (field) => !field.isSystem,
  )

  return validateProjectSchemaDefinition(customFields)
}
