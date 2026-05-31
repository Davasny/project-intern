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
  intern_run_not_found: "intern run was not found",
  project_not_found: "project was not found",
  record_not_found: "record was not found",
  task_not_found: "task was not found",
  work_record_not_found: "work record was not found",
  intern_run_work_record_mismatch: "intern run does not belong to work record",
  record_project_mismatch: "record does not belong to project",
  task_project_mismatch: "task does not belong to project",
  work_record_record_mismatch: "work record does not belong to record",
  work_record_task_mismatch: "work record does not belong to task",
}

const buildScopeSnippet = (scope: ExecutionRunScope) => {
  return [
    `internRunId=${formatScopeIdSnippet(scope.internRunId)}`,
    `projectId=${formatScopeIdSnippet(scope.projectId)}`,
    `recordId=${formatScopeIdSnippet(scope.recordId)}`,
    `taskId=${formatScopeIdSnippet(scope.taskId)}`,
    `workRecordId=${formatScopeIdSnippet(scope.workRecordId)}`,
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
