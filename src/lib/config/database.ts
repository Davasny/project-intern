import "server-only"

import { z } from "zod"

const databaseConfigSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://intern:intern@localhost:5433/project_intern"),
})

export const databaseConfig = databaseConfigSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
})
