import { config } from "dotenv"
import { z } from "zod"

config({
  quiet: true,
})

const frontendConfigSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Project Intern"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_ENABLE_DEVELOPMENT_ANONYMOUS_AUTH: z.boolean(),
})

export const frontendConfig = frontendConfigSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ENABLE_DEVELOPMENT_ANONYMOUS_AUTH:
    (process.env.NODE_ENV ?? "development") === "development",
})
