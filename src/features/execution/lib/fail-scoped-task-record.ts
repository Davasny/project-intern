import {
  completeAgentRunCommand,
  failAgentRunCommand,
} from "@/features/agent-runs/lib/agent-run-commands"
import { syncAgentRunMetricsFromSession } from "@/features/agent-runs/lib/sync-agent-run-metrics-from-session"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import { mirrorRecordWorkspaceDataToStorage } from "@/features/execution/lib/mirror-record-workspace-data-to-storage"
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
    const mirroredWorkspaceData = await mirrorRecordWorkspaceDataToStorage({
      organizationId: scope.project.organizationId,
      projectId: scope.project.id,
      recordId: scope.record.id,
    })

    await completeAgentRunCommand({
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
        mirroredDataEntries: mirroredWorkspaceData.mirroredEntryCount,
        mirroredDataFrom: mirroredWorkspaceData.dataDirectory,
        mirroredDataTo: mirroredWorkspaceData.storageDirectory,
      },
    })

    syncAgentRunMetricsFromSession({
      agentRunId: scope.agentRun.id,
      organizationId: scope.project.organizationId,
    }).catch(() => {
      // fire-and-forget: logged internally
    })

    return getTaskRecordExecutionScope(executionScope)
  }

  const mirroredWorkspaceData = await mirrorRecordWorkspaceDataToStorage({
    organizationId: scope.project.organizationId,
    projectId: scope.project.id,
    recordId: scope.record.id,
  })

  await failAgentRunCommand({
    agentRunId: scope.agentRun.id,
    costUsd: null,
    errorCode: failure.code,
    failurePayload: failure,
    latencyMs: null,
    taskRecordId: scope.taskRecord.id,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary: {
      ...toolActivitySummary,
      mirroredDataEntries: mirroredWorkspaceData.mirroredEntryCount,
      mirroredDataFrom: mirroredWorkspaceData.dataDirectory,
      mirroredDataTo: mirroredWorkspaceData.storageDirectory,
    },
  })

  syncAgentRunMetricsFromSession({
    agentRunId: scope.agentRun.id,
    organizationId: scope.project.organizationId,
  }).catch(() => {
    // fire-and-forget: logged internally
  })

  return getTaskRecordExecutionScope(executionScope)
}
