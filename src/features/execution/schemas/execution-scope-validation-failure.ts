type ExecutionScopeField =
  | "internRunId"
  | "projectId"
  | "recordId"
  | "taskId"
  | "workRecordId"

export type ExecutionScopeValidationFailureReason =
  | "intern_run_not_found"
  | "project_not_found"
  | "record_not_found"
  | "task_not_found"
  | "work_record_not_found"
  | "intern_run_work_record_mismatch"
  | "record_project_mismatch"
  | "task_project_mismatch"
  | "work_record_record_mismatch"
  | "work_record_task_mismatch"

export type ExecutionScopeValidationFailure = {
  invalidFields: ExecutionScopeField[]
  reason: ExecutionScopeValidationFailureReason
}
