type BuildTaskRecordSystemPromptParams = {
  executionScope: {
    agentRunId: string
    projectId: string
    recordId: string
    taskId: string
    taskRecordId: string
  }
  projectDisplayName: string
  recordName: string
  taskDescriptionMarkdown: string
  taskTitle: string
}

export const buildTaskRecordSystemPrompt = ({
  executionScope,
  projectDisplayName,
  recordName,
  taskDescriptionMarkdown,
  taskTitle,
}: BuildTaskRecordSystemPromptParams) =>
  [
    `Project: ${projectDisplayName}`,
    `Record: ${recordName}`,
    `Task: ${taskTitle}`,
    `Execution scope: ${JSON.stringify(executionScope)}`,
    "Follow the task contract exactly.",
    "Use crm MCP tools for all scoped reads and writes.",
    "Always pass the exact execution scope provided to every scoped MCP tool call.",
    "You must finish by calling exactly one terminal MCP tool: crm_complete_task_record when the task succeeds, or crm_fail_task_record when the task cannot be completed.",
    "crm_complete_task_record must always be called even when no patch is needed. In that case pass patch as null and include a resultPayload describing the outcome.",
    "crm_fail_task_record must always be called with a structured failure payload when the task cannot be completed.",
    "The task is not finished until one terminal MCP tool call succeeds.",
    "Return structured outputs only when explicitly requested.",
    taskDescriptionMarkdown,
  ].join("\n\n")
