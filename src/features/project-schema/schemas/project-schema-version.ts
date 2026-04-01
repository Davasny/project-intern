import { z } from "zod"
import { projectSchemaFieldSchema } from "@/features/project-schema/schemas/project-schema-field"

export const projectSchemaDefinitionSchema = z.object({
  fields: z.array(projectSchemaFieldSchema).min(2),
})

export type ProjectSchemaDefinition = z.infer<
  typeof projectSchemaDefinitionSchema
>
