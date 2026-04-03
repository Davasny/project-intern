import { z } from "zod"

export const projectSchemaVersionStateSchema = z.enum([
  "created",
  "accepted",
  "rejected",
])

export type ProjectSchemaVersionState = z.infer<
  typeof projectSchemaVersionStateSchema
>
