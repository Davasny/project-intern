import { config } from "dotenv"
import { z } from "zod"

config({
  quiet: true,
})

const databaseConfigSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://intern:intern@localhost:5438/project_intern"),
})

export const databaseConfig = databaseConfigSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
})
