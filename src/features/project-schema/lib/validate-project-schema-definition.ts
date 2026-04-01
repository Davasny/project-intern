import { z } from "zod"
import { buildProjectSchemaFieldValidator } from "@/features/project-schema/lib/build-context-schema"
import { getSystemProjectSchemaFields } from "@/features/project-schema/lib/get-system-project-schema-fields"
import { projectSchemaCustomFieldSchema } from "@/features/project-schema/schemas/project-schema-field"
import {
  type ProjectSchemaDefinition,
  projectSchemaDefinitionSchema,
} from "@/features/project-schema/schemas/project-schema-version"

const reservedFieldKeys = new Set(["id", "name"])

const validateCustomField = (field: unknown) => {
  const parsedField = projectSchemaCustomFieldSchema.parse(field)

  if (reservedFieldKeys.has(parsedField.key)) {
    throw new z.ZodError([
      {
        code: "custom",
        input: parsedField.key,
        message: `Field key ${parsedField.key} is reserved.`,
        path: ["key"],
      },
    ])
  }

  return parsedField
}

const validateUniqueFieldKeys = (schemaDefinition: ProjectSchemaDefinition) => {
  const fieldKeys = schemaDefinition.fields.map((field) => field.key)
  const uniqueKeys = new Set(fieldKeys)

  if (fieldKeys.length !== uniqueKeys.size) {
    throw new z.ZodError([
      {
        code: "custom",
        input: fieldKeys,
        message: "Field keys must be unique.",
        path: ["fields"],
      },
    ])
  }
}

const validateFieldDefaults = (schemaDefinition: ProjectSchemaDefinition) => {
  for (const field of schemaDefinition.fields) {
    if (field.isSystem || field.defaultValue === null) {
      continue
    }

    buildProjectSchemaFieldValidator(field).parse(field.defaultValue)
  }
}

export const validateProjectSchemaDefinition = (customFields: unknown[]) => {
  const parsedCustomFields = customFields.map(validateCustomField)
  const schemaDefinition = projectSchemaDefinitionSchema.parse({
    fields: [...getSystemProjectSchemaFields(), ...parsedCustomFields],
  })

  validateUniqueFieldKeys(schemaDefinition)
  validateFieldDefaults(schemaDefinition)

  return schemaDefinition
}
