import { completeAgentRun } from "@/features/agent-runs/lib/complete-agent-run"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import { getTaskRecordPatchSchemaVersion } from "@/features/execution/lib/get-task-record-patch-schema-version"
import type { PatchProposal } from "@/features/execution/schemas/patch-proposal"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { applyRecordPatch } from "@/features/records/lib/apply-record-patch"
import { syncRecordSchemaVersion } from "@/features/records/lib/sync-record-schema-version"
import { db } from "@/lib/db"

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

    await createActivityLogEvent({
      actorId: scope.agentRun.id,
      actorType: "executor",
      agentRunId: scope.agentRun.id,
      database: db,
      entityId: scope.record.id,
      entityType: "record",
      eventType: "record.patch_applied",
      organizationId: scope.project.organizationId,
      payload: {
        baseVersion: patch.baseVersion,
        changeCount: patch.changes.length,
        taskTitle: scope.task.title,
      },
      projectId: scope.project.id,
      recordId: scope.record.id,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: scope.task.id,
      taskRecordId: scope.taskRecord.id,
    })
  }

  if (scope.task.targetSchemaVersionId !== null) {
    await syncRecordSchemaVersion({
      projectId: scope.project.id,
      recordId: scope.record.id,
      schemaVersion: scope.task.schemaVersion,
    })
  }

  await completeAgentRun({
    agentRunId: scope.agentRun.id,
    costUsd: null,
    latencyMs: null,
    resultPayload,
    taskRecordId: scope.taskRecord.id,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary,
  })

  return getTaskRecordExecutionScope(executionScope)
}
