import { completeAgentRunCommand } from "@/features/agent-runs/lib/agent-run-commands"
import { syncAgentRunMetricsFromSession } from "@/features/agent-runs/lib/sync-agent-run-metrics-from-session"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import { getTaskRecordPatchSchemaVersion } from "@/features/execution/lib/get-task-record-patch-schema-version"
import { mirrorRecordWorkspaceDataToStorage } from "@/features/execution/lib/mirror-record-workspace-data-to-storage"
import type { PatchProposal } from "@/features/execution/schemas/patch-proposal"
import { applyRecordPatch } from "@/features/records/lib/apply-record-patch"
import { syncRecordSchemaVersion } from "@/features/records/lib/sync-record-schema-version"

type CompleteScopedTaskRecordParams = {
  executionScope: {
    agentRunId: string
    projectId: string
    recordId: string
    taskId: string
    taskRecordId: string
  }
  patch: PatchProposal | null
  resultPayload: Record<string, unknown> | null
  toolActivitySummary: Record<string, unknown>
}

export const completeScopedTaskRecord = async ({
  executionScope,
  patch,
  resultPayload,
  toolActivitySummary,
}: CompleteScopedTaskRecordParams) => {
  const scope = await getTaskRecordExecutionScope(executionScope)
  const patchSchemaVersion = getTaskRecordPatchSchemaVersion({
    recordSchemaVersion: scope.record.schemaVersion,
    taskSchemaVersion: scope.task.schemaVersion,
    taskTargetSchemaVersionId: scope.task.targetSchemaVersionId,
  })

  if (patch) {
    await applyRecordPatch({
      patch,
      projectId: scope.project.id,
      recordId: scope.record.id,
      schemaVersion: patchSchemaVersion,
    })

  }

  if (scope.task.targetSchemaVersionId !== null) {
    await syncRecordSchemaVersion({
      projectId: scope.project.id,
      recordId: scope.record.id,
      schemaVersion: scope.task.schemaVersion,
    })
  }

  const mirroredWorkspaceData = await mirrorRecordWorkspaceDataToStorage({
    organizationId: scope.project.organizationId,
    projectId: scope.project.id,
    recordId: scope.record.id,
  })

  await completeAgentRunCommand({
    agentRunId: scope.agentRun.id,
    costUsd: null,
    latencyMs: null,
    resultPayload,
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

  // Fetch and persist actual metrics from the OpenCode session now that
  // the run is complete. This runs after the state machine transition
  // so real values overwrite the null placeholders.
  syncAgentRunMetricsFromSession({
    agentRunId: scope.agentRun.id,
    organizationId: scope.project.organizationId,
    projectId: scope.project.id,
  }).catch(() => {
    // fire-and-forget: logged internally
  })

  return getTaskRecordExecutionScope(executionScope)
}
