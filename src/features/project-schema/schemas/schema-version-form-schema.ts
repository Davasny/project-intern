import { z } from "zod"

export const schemaVersionFormSchema = z.object({
  fields: z.array(
    z.object({
      config: z.object({
        enumOptions: z.string(),
        max: z.string(),
        min: z.string(),
        multilineRows: z.string(),
      }),
      defaultValue: z.string(),
      description: z.string(),
      key: z.string().trim().min(1),
      label: z.string().trim().min(1),
      required: z.boolean(),
      type: z.enum([
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
        "string_array",
        "number_array",
      ]),
    }),
  ),
})

export type SchemaVersionFormValues = z.infer<typeof schemaVersionFormSchema>
