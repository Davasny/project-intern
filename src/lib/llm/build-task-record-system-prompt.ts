import { backendConfig } from "@/lib/config/backend"

type PreviousTaskExecution = {
  taskTitle: string
  state: string
  resultSummary: string | null
  finishedAt: string | null
  attemptNumber: number
}

type BuildTaskRecordSystemPromptParams = {
  executionScope: {
    agentRunId: string
    projectId: string
    recordId: string
    taskId: string
    taskRecordId: string
    workspaceDataDirectory: string
    pythonPath: string
  }
  projectDisplayName: string
  recordName: string
  taskTitle: string
  previousExecutions: PreviousTaskExecution[]
}

const formatPreviousExecutions = (
  executions: PreviousTaskExecution[],
): string => {
  if (executions.length === 0) {
    return "<previous_task_executions>\nNo previous task executions found for this record.\n</previous_task_executions>"
  }

  const entries = executions.map((exec) => {
    const summary = exec.resultSummary ?? "(no summary)"
    const timestamp = exec.finishedAt ?? "unknown"

    return `
<execution>
  <taskTitle>${exec.taskTitle}</taskTitle>
  <attempt>#${exec.attemptNumber}</attempt>
  <state>${exec.state}</state>
  <resultSummary>${summary}</resultSummary>
  <finishedAt>${timestamp}</finishedAt>
</execution>`
  })

  return `
<previous_task_executions>
  ${entries.join("\n")}
</previous_task_executions>`
}

export const buildTaskRecordSystemPrompt = ({
  executionScope,
  projectDisplayName,
  recordName,
  taskTitle,
  previousExecutions,
}: BuildTaskRecordSystemPromptParams) =>
  `
You are an automated headless task executor working in context of record. Your job is to complete task provided by user
following their instructions.

If you consider the task is done - call tool \`crm_record_complete_task\`.

If you can't complete the task - call tool \`crm_record_fail_task\`.

You can never finish the job without calling those tools.

You can't ask user for more information. If you are not sure about task workflow and there is not enough information to
make assumptions, fail the task.

User will never see your messages and thoughts, the only way you can return result of your work is via crm tools like 
\`crm_record_apply_patch\`.

If the task requires multiple tools calls it can be more efficient to use CRM REST API directly. You can get api schema docs
under ${backendConfig.BETTER_AUTH_URL}/api/crm/schema.json. The bearer token is available in \`.env.agent\` as \`CRM_BEARER_TOKEN\`.

All task and record related files are must live in \`data/\` directory which is only allowed directory to work on.

If user asks you to create/remove/manage files, you have to use \`data/\` directory.

When working on pdf files prefer using pdf skill, if it doesn't work in 1st attempt fallback to glm-ocr skill

${formatPreviousExecutions(previousExecutions)}

<context>
Project name: ${projectDisplayName}
Project ID: ${executionScope.projectId}

Record name: ${recordName}
Record ID: ${executionScope.recordId}

Task title: ${taskTitle}
Task ID: ${executionScope.taskId} 

Agent run ID: ${executionScope.agentRunId}

Task record ID: ${executionScope.taskRecordId}

Workspace data directory: ${executionScope.workspaceDataDirectory}
Python executable path: ${executionScope.pythonPath}
</context>
`
