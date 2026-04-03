import type { Config } from "@opencode-ai/sdk"
import { backendConfig } from "@/lib/config/backend"

type BuildOpencodeConfigParams = {
  mcpToken: string
  skillsPaths?: Array<string>
  // skillPermission?: "allow" | "deny" | "ask"
}

export const buildOpencodeConfig = (
  params: BuildOpencodeConfigParams,
): Config => {
  const { mcpToken, skillsPaths = [] } = params

  const partialConfig: Config = {
    agent: {
      "record-worker": {
        description: "Scoped CRM record worker",
        maxSteps: 12,
        permission: {
          bash: "allow",
          doom_loop: "deny",
          edit: "allow",
          external_directory: "deny",
          webfetch: "allow",
        },
        prompt:
          "You execute one scoped CRM record task at a time. Use the crm MCP server for record, relation, file, artifact, and workspace operations. Do not mutate records outside the current task scope.",
        tools: {
          edit: true,
          patch: true,
          read: true,
          write: true,
        },
      },
    },
    mcp: {
      crm: {
        headers: {
          Authorization: `Bearer ${mcpToken}`,
        },
        type: "remote",
        url: `${backendConfig.BETTER_AUTH_URL}/api/mcp`,
      },
    },
    model: backendConfig.CRM_DEFAULT_RUNTIME_MODEL,
    permission: {
      bash: "allow",
      doom_loop: "deny",
      edit: "allow",
      external_directory: "deny",
      webfetch: "allow",
    },
  }

  return partialConfig
}
