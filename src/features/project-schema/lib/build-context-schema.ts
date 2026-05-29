import { z } from "zod"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Must be a valid date in YYYY-MM-DD format.",
})

const datetimeStringSchema = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Must be a valid datetime.",
  )

const jsonValueSchema: z.ZodType<
  string | number | boolean | null | Record<string, unknown> | unknown[]
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
)

const applyFieldConfig = (
  fieldSchema: z.ZodType<unknown>,
  field: ProjectSchemaField,
) => {
  if (field.type === "number") {
    let numberSchema = z.number().finite()

    if (field.config.min !== null) {
      numberSchema = numberSchema.min(field.config.min)
    }

    if (field.config.max !== null) {
      numberSchema = numberSchema.max(field.config.max)
    }

    return numberSchema
  }

  if (field.type === "text" || field.type === "long_text") {
    let stringSchema = z.string()

    if (field.required) {
      stringSchema = stringSchema.trim().min(1, `${field.label} is required.`)
    }

    return stringSchema
  }

  return fieldSchema
}

export const buildProjectSchemaFieldValidator = (field: ProjectSchemaField) => {
  let fieldSchema: z.ZodType<unknown>

  if (field.type === "text" || field.type === "long_text") {
    fieldSchema = z.string()
  } else if (field.type === "number") {
    fieldSchema = z.number().finite()
  } else if (field.type === "boolean") {
    fieldSchema = z.boolean()
  } else if (field.type === "date") {
    fieldSchema = dateStringSchema
  } else if (field.type === "datetime") {
    fieldSchema = datetimeStringSchema
  } else if (field.type === "url") {
    fieldSchema = z.string().url("Must be a valid URL.")
  } else if (field.type === "email") {
    fieldSchema = z.string().email("Must be a valid email address.")
  } else if (field.type === "enum") {
    const values = field.config.enumOptions
    const [firstOption, ...restOptions] = values

    if (!firstOption) {
      return z.never({
        error: `${field.label} must define at least one enum option.`,
      })
    }

    fieldSchema = z.enum([firstOption, ...restOptions])
  } else if (field.type === "string_array") {
    fieldSchema = z.array(z.string())
  } else if (field.type === "number_array") {
    fieldSchema = z.array(z.number().finite())
  } else {
    fieldSchema = jsonValueSchema
  }

  const configuredFieldSchema = applyFieldConfig(fieldSchema, field)

  if (field.required) {
    return configuredFieldSchema
  }

  return configuredFieldSchema.nullable().optional()
}

export const buildContextSchema = (
  schemaDefinition: ProjectSchemaDefinition,
) => {
  const customFields = schemaDefinition.fields.filter(
    (field) => !field.isSystem,
  )
  const contextShape = Object.fromEntries(
    customFields.map((field) => [
      field.key,
      buildProjectSchemaFieldValidator(field),
    ]),
  )

  return z.object(contextShape).strict()
}
