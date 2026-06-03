import { getWorkRecordExecutionScope } from "@/features/execution/lib/get-work-record-execution-scope"
import { getWorkRecordPatchSchemaVersion } from "@/features/execution/lib/get-work-record-patch-schema-version"
import { mirrorRecordWorkspaceDataToStorage } from "@/features/execution/lib/mirror-record-workspace-data-to-storage"
import type { PatchProposal } from "@/features/execution/schemas/patch-proposal"
import { completeInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { syncInternRunMetricsFromSession } from "@/features/intern-runs/lib/sync-intern-run-metrics-from-session"
import { applyRecordPatch } from "@/features/records/lib/apply-record-patch"
import { syncRecordSchemaVersion } from "@/features/records/lib/sync-record-schema-version"

type CompleteScopedWorkRecordParams = {
  executionScope: {
    internRunId: string
    projectId: string
    recordId: string
    taskId: string
    workRecordId: string
  }
  patch: PatchProposal | null
  resultPayload: Record<string, unknown> & { summary: string }
  toolActivitySummary: Record<string, unknown>
}

export const completeScopedWorkRecord = async ({
  executionScope,
  patch,
  resultPayload,
  toolActivitySummary,
}: CompleteScopedWorkRecordParams) => {
  const scope = await getWorkRecordExecutionScope(executionScope)
  const patchSchemaVersion = getWorkRecordPatchSchemaVersion({
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

  await completeInternRunCommand({
    internRunId: scope.internRun.id,
    costUsd: null,
    latencyMs: null,
    resultPayload,
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

  // Fetch and persist actual metrics from the OpenCode session now that
  // the run is complete. This runs after the state machine transition
  // so real values overwrite the null placeholders.
  syncInternRunMetricsFromSession({
    internRunId: scope.internRun.id,
    organizationId: scope.project.organizationId,
    projectId: scope.project.id,
  }).catch(() => {
    // fire-and-forget: logged internally
  })

  return getWorkRecordExecutionScope(executionScope)
}
