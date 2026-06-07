import type { Config } from "@opencode-ai/sdk"
import { buildInternPermission } from "@/features/opencode/lib/build-intern-permission"
import type { OpencodeSessionPurpose } from "@/features/opencode/lib/opencode-session-purpose"
import { backendConfig } from "@/lib/config/backend"
import { internAgent } from "@/lib/llm/agents"

export const buildOpencodeConfig = (params: {
  enabledSkillNames: string[]
  mcpToken: string
  runtimeTemperature: number | null
  sessionPurpose: OpencodeSessionPurpose
}): Config => ({
  // @ts-expect-error OpenCode supports external_directory rule maps, but SDK 1.15.11 types only expose scalar actions.
  agent: {
    [internAgent.name]: {
      description: internAgent.description,
      permission: buildInternPermission({
        basePermission: internAgent.permission,
        enabledSkillNames: params.enabledSkillNames,
        sessionPurpose: params.sessionPurpose,
      }),
      prompt: internAgent.prompt,
      temperature: params.runtimeTemperature ?? undefined,
      tools: internAgent.tools,
    },
  },
  mcp: {
    crm: {
      headers: {
        Authorization: `Bearer ${params.mcpToken}`,
      },
      type: "remote",
      url: `${backendConfig.BETTER_AUTH_URL}/api/mcp`,
    },
  },
  model: backendConfig.CRM_DEFAULT_RUNTIME_MODEL,
  tools: {
    "*": false,
    "crm_*": true,
  },
})
