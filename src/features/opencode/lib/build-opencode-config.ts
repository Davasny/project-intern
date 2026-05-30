import type { Config } from "@opencode-ai/sdk"
import { buildSkillPermission } from "@/features/opencode/lib/build-skill-permission"
import { backendConfig } from "@/lib/config/backend"
import { recordWorkerAgent } from "@/lib/llm/agents"

export const buildOpencodeConfig = (params: {
  enabledSkillNames: string[]
  mcpToken: string
  runtimeTemperature: number | null
}): Config => ({
  agent: {
    [recordWorkerAgent.name]: {
      description: recordWorkerAgent.description,
      permission: {
        ...recordWorkerAgent.permission,
        // @ts-expect-error supported by OpenCode config schema but missing from SDK type
        skill: buildSkillPermission(params.enabledSkillNames),
      },
      prompt: recordWorkerAgent.prompt,
      temperature: params.runtimeTemperature ?? undefined,
      tools: recordWorkerAgent.tools,
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
