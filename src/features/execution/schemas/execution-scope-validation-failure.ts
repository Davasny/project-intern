export type ExecutionScopeField =
  | "agentRunId"
  | "projectId"
  | "recordId"
  | "taskId"
  | "taskRecordId"

export type ExecutionScopeValidationFailureReason =
  | "agent_run_not_found"
  | "project_not_found"
  | "record_not_found"
  | "task_not_found"
  | "task_record_not_found"
  | "agent_run_task_record_mismatch"
  | "record_project_mismatch"
  | "task_project_mismatch"
  | "task_record_record_mismatch"
  | "task_record_task_mismatch"

export type ExecutionScopeValidationFailure = {
  invalidFields: ExecutionScopeField[]
  reason: ExecutionScopeValidationFailureReason
}
