import type { AgentConfig } from "@opencode-ai/sdk"
import { buildTaskRecordSystemPrompt } from "@/lib/llm/build-task-record-system-prompt"

type Agent = AgentConfig & {
  name: string
  description: string
  prompt: string
  systemPromptFn: typeof buildTaskRecordSystemPrompt
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
  systemPromptFn: buildTaskRecordSystemPrompt,
  permission: {
    bash: "allow",
    doom_loop: "deny",
    edit: "allow",
    external_directory: "deny",
    webfetch: "allow",
    // @ts-expect-error for some reason it's supported by opencode, but not in ts
    websearch: "allow",
    skill: {
      // todo: we should get list of available skills from project and then allow them here in the loop
      "*": "deny",
      docx: "allow",
      // pdf: "allow",
      xlsx: "allow",
      markitdown: "allow",
      "glm-ocr": "allow",
      "dostanesie-api": "allow",
      "agent-browser": "allow",
    },
  },
  tools: {
    edit: true,
    patch: true,
    read: true,
    write: true,
  },
}
