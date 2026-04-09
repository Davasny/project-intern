import { formatScopeIdSnippet } from "@/features/execution/lib/format-scope-id-snippet"
import type { ExecutionRunScope } from "@/features/execution/schemas/execution-run-scope"
import type {
  ExecutionScopeValidationFailure,
  ExecutionScopeValidationFailureReason,
} from "@/features/execution/schemas/execution-scope-validation-failure"

const executionScopeFailureReasonLabels: Record<
  ExecutionScopeValidationFailureReason,
  string
> = {
  agent_run_not_found: "agent run was not found",
  project_not_found: "project was not found",
  record_not_found: "record was not found",
  task_not_found: "task was not found",
  task_record_not_found: "task record was not found",
  agent_run_task_record_mismatch: "agent run does not belong to task record",
  record_project_mismatch: "record does not belong to project",
  task_project_mismatch: "task does not belong to project",
  task_record_record_mismatch: "task record does not belong to record",
  task_record_task_mismatch: "task record does not belong to task",
}

const buildScopeSnippet = (scope: ExecutionRunScope) => {
  return [
    `agentRunId=${formatScopeIdSnippet(scope.agentRunId)}`,
    `projectId=${formatScopeIdSnippet(scope.projectId)}`,
    `recordId=${formatScopeIdSnippet(scope.recordId)}`,
    `taskId=${formatScopeIdSnippet(scope.taskId)}`,
    `taskRecordId=${formatScopeIdSnippet(scope.taskRecordId)}`,
  ].join(", ")
}

export const buildExecutionScopeErrorMessage = ({
  failure,
  scope,
}: {
  failure: ExecutionScopeValidationFailure
  scope: ExecutionRunScope
}) => {
  const fieldList = failure.invalidFields.join(",")
  const reasonLabel = executionScopeFailureReasonLabels[failure.reason]
  const scopeSnippet = buildScopeSnippet(scope)

  return `Execution scope is invalid (reason=${failure.reason}; details=${reasonLabel}; invalidFields=${fieldList}). scope=${scopeSnippet}`
}
