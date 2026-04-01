import "server-only"

import { z } from "zod"

const backendConfigSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(1)
    .default("development-better-auth-secret"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().min(1).default("github-client-id"),
  GITHUB_CLIENT_SECRET: z.string().min(1).default("github-client-secret"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
})

const parsedBackendConfig = backendConfigSchema.parse({
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
})

export const backendConfig = {
  ...parsedBackendConfig,
  IS_DEVELOPMENT: parsedBackendConfig.NODE_ENV === "development",
}
