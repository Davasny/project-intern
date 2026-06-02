import type { AgentConfig } from "@opencode-ai/sdk"
import { buildWorkRecordSystemPrompt } from "@/lib/llm/build-work-record-system-prompt"

type Agent = AgentConfig & {
  name: string
  description: string
  prompt: string
  systemPromptFn: typeof buildWorkRecordSystemPrompt
}

export const recordWorkerAgent: Agent = {
  name: "record-worker",
  description: "Scoped CRM record worker",
  prompt: `
You execute one scoped CRM record task at a time. 
Use the crm MCP server for scoped record and relation operations.
Record workspace files are preloaded into ./data before the run starts.
Do not mutate records outside the current task scope.    
    `,
  systemPromptFn: buildWorkRecordSystemPrompt,
  permission: {
    bash: "allow",
    // @ts-expect-error for some reason it's supported by opencode, but not in ts
    glob: "allow",
    doom_loop: "deny",
    edit: "allow",
    external_directory: "deny",
    webfetch: "allow",
    websearch: "allow",
  },
  tools: {
    edit: true,
    patch: true,
    read: true,
    write: true,
  },
}
