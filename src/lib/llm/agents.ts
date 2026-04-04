import type { AgentConfig } from "@opencode-ai/sdk"
import { buildTaskRecordSystemPrompt } from "@/lib/llm/build-task-record-system-prompt"

type Agent = AgentConfig & {
  name: string
  description: string
  maxSteps: number
  prompt: string
  systemPromptFn: typeof buildTaskRecordSystemPrompt
}

export const recordWorkerAgent: Agent = {
  name: "record-worker",
  description: "Scoped CRM record worker",
  maxSteps: 12,
  prompt: `
You execute one scoped CRM record task at a time. 
Use the crm MCP server for scoped record and relation operations.
Record workspace files are preloaded into ./data before the run starts.
Do not mutate records outside the current task scope.    
    `,
  systemPromptFn: buildTaskRecordSystemPrompt,
  permission: {
    bash: "allow",
    doom_loop: "deny",
    edit: "allow",
    external_directory: "deny",
    webfetch: "allow",
  },
  tools: {
    edit: true,
    patch: true,
    read: true,
    write: true,
  },
}
