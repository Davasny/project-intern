import path from "node:path"
import { z } from "zod"

const backendConfigSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(1)
    .default("development-better-auth-secret"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  CRM_APPROVED_RUNTIME_MODELS: z
    .string()
    .default("openai/gpt-5,anthropic/claude-sonnet-4-5")
    .transform((value) =>
      value
        .split(",")
        .map((model) => model.trim())
        .filter((model) => model.length > 0),
    ),
  CRM_DEFAULT_RUNTIME_MODEL: z.string().default("openai/gpt-5"),
  CRM_EXECUTOR_TOKEN: z.string().min(1).default("development-executor-token"),
  CRM_MCP_TOKEN: z.string().min(1).default("development-mcp-token"),
  CRM_OPENCODE_BASE_URL: z.string().url().nullable().default(null),
  CRM_OPENCODE_HOST: z.string().min(1).default("127.0.0.1"),
  CRM_OPENCODE_PORT: z.coerce.number().int().positive().default(4096),
  CRM_OPENCODE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  CRM_STORAGE_ROOT: z
    .string()
    .min(1)
    .default(path.join(process.cwd(), "storage")),
  CRM_WORKSPACE_ROOT: z
    .string()
    .min(1)
    .default(path.join(process.cwd(), "agent-workspaces")),
  GITHUB_CLIENT_ID: z.string().min(1).default("github-client-id"),
  GITHUB_CLIENT_SECRET: z.string().min(1).default("github-client-secret"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
})

const parsedBackendConfig = backendConfigSchema.parse({
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  CRM_APPROVED_RUNTIME_MODELS: process.env.CRM_APPROVED_RUNTIME_MODELS,
  CRM_DEFAULT_RUNTIME_MODEL: process.env.CRM_DEFAULT_RUNTIME_MODEL,
  CRM_EXECUTOR_TOKEN: process.env.CRM_EXECUTOR_TOKEN,
  CRM_MCP_TOKEN: process.env.CRM_MCP_TOKEN,
  CRM_OPENCODE_BASE_URL: process.env.CRM_OPENCODE_BASE_URL ?? null,
  CRM_OPENCODE_HOST: process.env.CRM_OPENCODE_HOST,
  CRM_OPENCODE_PORT: process.env.CRM_OPENCODE_PORT,
  CRM_OPENCODE_TIMEOUT_MS: process.env.CRM_OPENCODE_TIMEOUT_MS,
  CRM_STORAGE_ROOT: process.env.CRM_STORAGE_ROOT,
  CRM_WORKSPACE_ROOT: process.env.CRM_WORKSPACE_ROOT,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
})

export const backendConfig = {
  ...parsedBackendConfig,
  IS_DEVELOPMENT: parsedBackendConfig.NODE_ENV === "development",
}
