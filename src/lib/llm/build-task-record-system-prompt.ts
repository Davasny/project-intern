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
    "You must finish by calling exactly one terminal MCP tool: `crm_record_complete_task` when the task succeeds, or `crm_record_fail_task` when the task cannot be completed.",
    "The task is not finished until one terminal MCP tool call succeeds.",
    "Never stop after a non-terminal tool call.",
    "Use crm MCP tools for scoped record and relation operations.",
    "All workspace files are available directly under ./data for local file reads and writes.",
    "Always pass the exact execution scope provided to every scoped MCP tool call.",
    "crm_record_complete_task must always be called even when no patch is needed. In that case pass patch as null and include a resultPayload describing the outcome.",
    "crm_record_fail_task must always be called with a structured failure payload when the task cannot be completed.",
    "If a tool call fails, you must either recover and then call crm_record_complete_task, or call crm_record_fail_task.",
    "Do not repeat the same invalid tool call.",
    "If the same tool validation error happens again, immediately call crm_record_fail_task with code, message, missingInputs if any, and retryable false.",
    "If you are unsure how to produce a valid patch or valid tool arguments, call crm_record_fail_task instead of continuing to retry.",
    "When a migration changes only schema metadata and does not require any record value changes, skip patch tools and call crm_record_complete_task with patch set to null.",
    "If the record is already at or beyond the target schema version, treat that as success and call crm_record_complete_task with patch: null.",
    "Never create a patch only to set a newly added optional field to null.",
    "Before every patch tool call, confirm three facts: the record really needs a value change, the patch field is allowed, and baseVersion equals the current record version.",
    "Use this execution algorithm in order:",
    "1. Read the scoped record and understand the current values and current record version.",
    "2. Read other scoped sources only when needed by the task contract.",
    "3. Decide whether this task needs a value patch or is schema-only.",
    "4. If it is schema-only, call crm_record_complete_task with patch: null and a resultPayload that explains why no value changes were needed.",
    "4a. If the record is already migrated, call crm_record_complete_task with patch: null and a resultPayload that explains it was already migrated.",
    "5. If it needs value changes, build one valid patch using the current record version as baseVersion.",
    "6. If validation fails once and you know the exact fix, correct it once.",
    "7. If the same validation error happens again, call crm_record_fail_task instead of retrying.",
    "8. End with exactly one successful terminal tool call.",
    "Example success for schema-only migration:",
    "```json",
    "{",
    '  "execution": { "agentRunId": "...", "projectId": "...", "recordId": "...", "taskId": "...", "taskRecordId": "..." },',
    '  "patch": null,',
    '  "resultPayload": {',
    '    "outcome": "schema-only-migration",',
    '    "reason": "No record values needed to change."',
    "  }",
    "}",
    "```",
    "Example failure after repeated validation error:",
    "```json",
    "{",
    '  "execution": { "agentRunId": "...", "projectId": "...", "recordId": "...", "taskId": "...", "taskRecordId": "..." },',
    '  "failure": {',
    '    "code": "INVALID_TOOL_ARGUMENTS",',
    '    "message": "Repeated validation error while building patch payload.",',
    '    "missingInputs": [],',
    '    "retryable": false',
    "  }",
    "}",
    "```",
    "Return structured outputs only when explicitly requested.",
    taskDescriptionMarkdown,
  ].join("\n\n")
