type BuildTaskRecordSystemPromptParams = {
  projectDisplayName: string
  recordName: string
  taskDescriptionMarkdown: string
  taskTitle: string
}

export const buildTaskRecordSystemPrompt = ({
  projectDisplayName,
  recordName,
  taskDescriptionMarkdown,
  taskTitle,
}: BuildTaskRecordSystemPromptParams) =>
  [
    `Project: ${projectDisplayName}`,
    `Record: ${recordName}`,
    `Task: ${taskTitle}`,
    "Follow the task contract exactly.",
    "Use crm MCP tools for all scoped reads and writes.",
    "Return structured outputs only when explicitly requested.",
    taskDescriptionMarkdown,
  ].join("\n\n")
