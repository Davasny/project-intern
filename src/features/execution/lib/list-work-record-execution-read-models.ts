import { and, asc, eq, inArray } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { calculateInternRunDurationMs } from "@/features/intern-runs/lib/calculate-intern-run-duration-ms"
import { getInternRunStatusTooltipText } from "@/features/intern-runs/lib/get-intern-run-status-tooltip-text"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type ListWorkRecordExecutionReadModelsParams = {
  projectId: string
  recordId: string | null
  taskId: string | null
}

export const listWorkRecordExecutionReadModels = async ({
  projectId,
  recordId,
  taskId,
}: ListWorkRecordExecutionReadModelsParams) => {
  const filters = [eq(taskTable.projectId, projectId)]

  if (recordId !== null) {
    filters.push(eq(workRecordTable.recordId, recordId))
  }

  if (taskId !== null) {
    filters.push(eq(workRecordTable.taskId, taskId))
  }

  const workRecords = await db
    .select({
      internRunId: workRecordTable.internRunId,
      errorCode: workRecordTable.errorCode,
      lastTransitionAt: workRecordTable.lastTransitionAt,
      recordId: workRecordTable.recordId,
      recordName: recordTable.name,
      state: workRecordTable.state,
      taskSchemaVersion: taskTable.schemaVersion,
      taskId: workRecordTable.taskId,
      workRecordId: workRecordTable.id,
      taskSortOrder: taskTable.sortOrder,
      taskTargetSchemaVersionId: taskTable.targetSchemaVersionId,
      taskTitle: taskTable.title,
    })
    .from(workRecordTable)
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(workRecordTable.recordId, recordTable.id))
    .where(and(...filters))
    .orderBy(
      asc(taskTable.sortOrder),
      asc(workRecordTable.recordId),
      asc(workRecordTable.id),
    )

  const workRecordIds = workRecords.map((workRecord) => workRecord.workRecordId)

  const internRuns =
    workRecordIds.length > 0
      ? await db
          .select({
            attemptNumber: internRunTable.attemptNumber,
            estimatedCostUsd: internRunTable.estimatedCostUsd,
            failurePayload: internRunTable.failurePayload,
            finishedAt: internRunTable.finishedAt,
            id: internRunTable.id,
            inputTokens: internRunTable.inputTokens,
            latencyMs: internRunTable.latencyMs,
            model: internRunTable.model,
            outputTokens: internRunTable.outputTokens,
            provider: internRunTable.provider,
            resultPayload: internRunTable.resultPayload,
            selectedIntern: internRunTable.selectedIntern,
            selectedModel: internRunTable.selectedModel,
            selectedTemperature: internRunTable.selectedTemperature,
            startedAt: internRunTable.startedAt,
            state: internRunTable.state,
            workRecordId: internRunTable.workRecordId,
            toolCallCount: internRunTable.toolCallCount,
            toolSummary: internRunTable.toolSummary,
            updatedAt: internRunTable.updatedAt,
          })
          .from(internRunTable)
          .where(inArray(internRunTable.workRecordId, workRecordIds))
      : []

  const internRunReadModels = internRuns.map((internRun) => ({
    ...internRun,
    durationMs: calculateInternRunDurationMs({
      finishedAt: internRun.finishedAt,
      latencyMs: internRun.latencyMs,
      startedAt: internRun.startedAt,
    }),
    statusTooltipText: getInternRunStatusTooltipText({
      failurePayload: internRun.failurePayload,
      resultPayload: internRun.resultPayload,
    }),
  }))

  const internRunsByWorkRecordId = new Map<string, typeof internRunReadModels>()

  for (const internRun of internRunReadModels) {
    const existingInternRuns =
      internRunsByWorkRecordId.get(internRun.workRecordId) ?? []
    existingInternRuns.push(internRun)
    existingInternRuns.sort(
      (left, right) => right.attemptNumber - left.attemptNumber,
    )
    internRunsByWorkRecordId.set(internRun.workRecordId, existingInternRuns)
  }

  return workRecords.map((workRecord) => {
    const linkedInternRuns =
      internRunsByWorkRecordId.get(workRecord.workRecordId) ?? []
    const linkedCurrentInternRun = workRecord.internRunId
      ? linkedInternRuns.find(
          (internRun) => internRun.id === workRecord.internRunId,
        )
      : null
    const latestInternRun = linkedInternRuns[0] ?? null

    return {
      ...workRecord,
      attemptCount: linkedInternRuns.length,
      currentInternRun: linkedCurrentInternRun ?? null,
      latestInternRun,
      latestFailurePayload: latestInternRun?.failurePayload ?? null,
      latestResultPayload: latestInternRun?.resultPayload ?? null,
    }
  })
}
