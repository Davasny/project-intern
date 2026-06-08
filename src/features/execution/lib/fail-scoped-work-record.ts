import { getWorkRecordExecutionScope } from "@/features/execution/lib/get-work-record-execution-scope"
import { mirrorRecordWorkspaceDataToStorage } from "@/features/execution/lib/mirror-record-workspace-data-to-storage"
import type { TaskFailure } from "@/features/execution/schemas/task-failure"
import {
  completeInternRunCommand,
  failInternRunCommand,
} from "@/features/intern-runs/lib/intern-run-commands"
import { syncInternRunMetricsFromSession } from "@/features/intern-runs/lib/sync-intern-run-metrics-from-session"

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

type FailScopedWorkRecordParams = {
  executionScope: {
    internRunId: string
    projectId: string
    recordId: string
    taskId: string
    workRecordId: string
  }
  failure: TaskFailure
  toolActivitySummary: Record<string, unknown>
}

export const failScopedWorkRecord = async ({
  executionScope,
  failure,
  toolActivitySummary,
}: FailScopedWorkRecordParams) => {
  const scope = await getWorkRecordExecutionScope(executionScope)

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

    await completeInternRunCommand({
      internRunId: scope.internRun.id,
      cachedInputTokens: null,
      cacheWriteTokens: null,
      costUsd: null,
      latencyMs: null,
      resultPayload: {
        outcome: "already-migrated",
        summary: failure.reason,
      },
      workRecordId: scope.workRecord.id,
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

    syncInternRunMetricsFromSession({
      internRunId: scope.internRun.id,
      organizationId: scope.project.organizationId,
      projectId: scope.project.id,
    }).catch(() => {
      // fire-and-forget: logged internally
    })

    return getWorkRecordExecutionScope(executionScope)
  }

  const mirroredWorkspaceData = await mirrorRecordWorkspaceDataToStorage({
    organizationId: scope.project.organizationId,
    projectId: scope.project.id,
    recordId: scope.record.id,
  })

  await failInternRunCommand({
    internRunId: scope.internRun.id,
    cachedInputTokens: null,
    cacheWriteTokens: null,
    costUsd: null,
    errorCode: failure.code,
    failurePayload: failure,
    latencyMs: null,
    workRecordId: scope.workRecord.id,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary: {
      ...toolActivitySummary,
      mirroredDataEntries: mirroredWorkspaceData.mirroredEntryCount,
      mirroredDataFrom: mirroredWorkspaceData.dataDirectory,
      mirroredDataTo: mirroredWorkspaceData.storageDirectory,
    },
  })

  syncInternRunMetricsFromSession({
    internRunId: scope.internRun.id,
    organizationId: scope.project.organizationId,
    projectId: scope.project.id,
  }).catch(() => {
    // fire-and-forget: logged internally
  })

  return getWorkRecordExecutionScope(executionScope)
}
