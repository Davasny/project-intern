import type { Config } from "@opencode-ai/sdk"
import { backendConfig } from "@/lib/config/backend"

export const buildOpencodeConfig = (): Config => ({
  agent: {
    "record-worker": {
      description: "Scoped CRM record worker",
      maxSteps: 12,
      permission: {
        bash: "deny",
        doom_loop: "deny",
        edit: "allow",
        external_directory: "deny",
        webfetch: "deny",
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
        Authorization: `Bearer ${backendConfig.CRM_MCP_TOKEN}`,
      },
      type: "remote",
      url: `${backendConfig.BETTER_AUTH_URL}/api/mcp`,
    },
  },
  model: backendConfig.CRM_DEFAULT_RUNTIME_MODEL,
  permission: {
    bash: "deny",
    doom_loop: "deny",
    edit: "allow",
    external_directory: "deny",
    webfetch: "deny",
  },
})
