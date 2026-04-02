import { completeAgentRun } from "@/features/agent-runs/lib/complete-agent-run"
import { failAgentRun } from "@/features/agent-runs/lib/fail-agent-run"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import type { TaskFailure } from "@/features/execution/schemas/task-failure"

const shouldTreatFailureAsAlreadyMigratedSuccess = ({
  failure,
  recordSchemaVersion,
  taskSchemaVersion,
  taskTargetSchemaVersionId,
}: {
  failure: TaskFailure
  recordSchemaVersion: number
  taskSchemaVersion: number
  taskTargetSchemaVersionId: string | null
}) => {
  return (
    failure.code === "ALREADY_MIGRATED" &&
    taskTargetSchemaVersionId !== null &&
    recordSchemaVersion >= taskSchemaVersion
  )
}

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

  if (
    shouldTreatFailureAsAlreadyMigratedSuccess({
      failure,
      recordSchemaVersion: scope.record.schemaVersion,
      taskSchemaVersion: scope.task.schemaVersion,
      taskTargetSchemaVersionId: scope.task.targetSchemaVersionId,
    })
  ) {
    await completeAgentRun({
      agentRunId: scope.agentRun.id,
      costUsd: null,
      latencyMs: null,
      resultPayload: {
        outcome: "already-migrated",
        reason: failure.message,
      },
      taskRecordId: scope.taskRecord.id,
      tokenInput: null,
      tokenOutput: null,
      toolActivitySummary: {
        ...toolActivitySummary,
        completionSource: "already-migrated",
      },
    })

    return getTaskRecordExecutionScope(executionScope)
  }

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
