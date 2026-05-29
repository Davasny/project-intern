import { z } from "zod"

const projectSchemaVersionStateSchema = z.enum([
  "created",
  "accepted",
  "rejected",
])

export type ProjectSchemaVersionState = z.infer<
  typeof projectSchemaVersionStateSchema
>
