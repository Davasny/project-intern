import { getWorkRecordExecutionScope } from "@/features/execution/lib/get-work-record-execution-scope"
import { mirrorRecordWorkspaceDataToStorage } from "@/features/execution/lib/mirror-record-workspace-data-to-storage"
import { skipInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { syncInternRunMetricsFromSession } from "@/features/intern-runs/lib/sync-intern-run-metrics-from-session"

type SkipScopedWorkRecordParams = {
  executionScope: {
    internRunId: string
    projectId: string
    recordId: string
    taskId: string
    workRecordId: string
  }
  reason: string
  resultPayload: Record<string, unknown> | null
  toolActivitySummary: Record<string, unknown>
}

export const skipScopedWorkRecord = async ({
  executionScope,
  reason,
  resultPayload,
  toolActivitySummary,
}: SkipScopedWorkRecordParams) => {
  const scope = await getWorkRecordExecutionScope(executionScope)
  const mirroredWorkspaceData = await mirrorRecordWorkspaceDataToStorage({
    organizationId: scope.project.organizationId,
    projectId: scope.project.id,
    recordId: scope.record.id,
  })

  await skipInternRunCommand({
    internRunId: scope.internRun.id,
    resultPayload: {
      ...(resultPayload ?? {}),
      outcome: "skipped",
      reason,
    },
    workRecordId: scope.workRecord.id,
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
