import { z } from "zod"

const schemaFieldTypeValues = [
  "text",
  "long_text",
  "number",
  "boolean",
  "date",
  "datetime",
  "url",
  "email",
  "enum",
  "json",
] as const

const fieldConfigSchema = z
  .object({
    enumOptions: z.array(z.string().trim().min(1)).default([]),
    max: z.number().finite().nullable().default(null),
    min: z.number().finite().nullable().default(null),
    multilineRows: z.number().int().positive().nullable().default(null),
  })
  .strict()

const projectSchemaFieldBaseSchema = z.object({
  config: fieldConfigSchema,
  defaultValue: z.unknown().nullable(),
  description: z.string().trim(),
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  required: z.boolean(),
  type: z.enum(schemaFieldTypeValues),
})

export const projectSchemaFieldSchema = projectSchemaFieldBaseSchema.extend({
  isSystem: z.boolean(),
})

export const projectSchemaCustomFieldSchema =
  projectSchemaFieldBaseSchema.extend({
    isSystem: z.literal(false),
  })

export type ProjectSchemaField = z.infer<typeof projectSchemaFieldSchema>
type ProjectSchemaCustomField = z.infer<
  typeof projectSchemaCustomFieldSchema
>
type ProjectSchemaFieldType = (typeof schemaFieldTypeValues)[number]
