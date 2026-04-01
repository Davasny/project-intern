import { failAgentRun } from "@/features/agent-runs/lib/fail-agent-run"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import type { TaskFailure } from "@/features/execution/schemas/task-failure"

type FailScopedTaskRecordParams = {
  executionScope: {
    agentRunId: string
    projectId: string
    recordId: string
    taskId: string
    taskRecordId: string
  }
  failure: TaskFailure
  toolActivitySummary: Record<string, unknown>
}

export const failScopedTaskRecord = async ({
  executionScope,
  failure,
  toolActivitySummary,
}: FailScopedTaskRecordParams) => {
  const scope = await getTaskRecordExecutionScope(executionScope)

  await failAgentRun({
    agentRunId: scope.agentRun.id,
    costUsd: null,
    errorCode: failure.code,
    failurePayload: failure,
    latencyMs: null,
    taskRecordId: scope.taskRecord.id,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary,
  })

  return getTaskRecordExecutionScope(executionScope)
}
