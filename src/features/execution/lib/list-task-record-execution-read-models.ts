import { and, eq, inArray } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type ListTaskRecordExecutionReadModelsParams = {
  projectId: string
  recordId: string | null
  taskId: string | null
}

export const listTaskRecordExecutionReadModels = async ({
  projectId,
  recordId,
  taskId,
}: ListTaskRecordExecutionReadModelsParams) => {
  const filters = [eq(taskTable.projectId, projectId)]

  if (recordId !== null) {
    filters.push(eq(taskRecordTable.recordId, recordId))
  }

  if (taskId !== null) {
    filters.push(eq(taskRecordTable.taskId, taskId))
  }

  const taskRecords = await db
    .select({
      agentRunId: taskRecordTable.agentRunId,
      errorCode: taskRecordTable.errorCode,
      lastTransitionAt: taskRecordTable.lastTransitionAt,
      recordId: taskRecordTable.recordId,
      recordName: recordTable.name,
      state: taskRecordTable.state,
      taskSchemaVersion: taskTable.schemaVersion,
      taskId: taskRecordTable.taskId,
      taskRecordId: taskRecordTable.id,
      taskSortOrder: taskTable.sortOrder,
      taskTargetSchemaVersionId: taskTable.targetSchemaVersionId,
      taskTitle: taskTable.title,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .where(and(...filters))

  const taskRecordIds = taskRecords.map((taskRecord) => taskRecord.taskRecordId)

  const agentRuns =
    taskRecordIds.length > 0
      ? await db
          .select({
            attemptNumber: agentRunTable.attemptNumber,
            estimatedCostUsd: agentRunTable.estimatedCostUsd,
            failurePayload: agentRunTable.failurePayload,
            finishedAt: agentRunTable.finishedAt,
            id: agentRunTable.id,
            inputTokens: agentRunTable.inputTokens,
            latencyMs: agentRunTable.latencyMs,
            model: agentRunTable.model,
            outputTokens: agentRunTable.outputTokens,
            provider: agentRunTable.provider,
            resultPayload: agentRunTable.resultPayload,
            selectedAgent: agentRunTable.selectedAgent,
            selectedModel: agentRunTable.selectedModel,
            startedAt: agentRunTable.startedAt,
            state: agentRunTable.state,
            taskRecordId: agentRunTable.taskRecordId,
            toolCallCount: agentRunTable.toolCallCount,
            toolSummary: agentRunTable.toolSummary,
            updatedAt: agentRunTable.updatedAt,
          })
          .from(agentRunTable)
          .where(inArray(agentRunTable.taskRecordId, taskRecordIds))
      : []

  const agentRunsByTaskRecordId = new Map<string, typeof agentRuns>()

  for (const agentRun of agentRuns) {
    const existingAgentRuns =
      agentRunsByTaskRecordId.get(agentRun.taskRecordId) ?? []
    existingAgentRuns.push(agentRun)
    existingAgentRuns.sort(
      (left, right) => right.attemptNumber - left.attemptNumber,
    )
    agentRunsByTaskRecordId.set(agentRun.taskRecordId, existingAgentRuns)
  }

  return taskRecords.map((taskRecord) => {
    const linkedAgentRuns =
      agentRunsByTaskRecordId.get(taskRecord.taskRecordId) ?? []
    const latestAgentRun = linkedAgentRuns[0] ?? null

    return {
      ...taskRecord,
      attemptCount: linkedAgentRuns.length,
      latestAgentRun,
      latestFailurePayload: latestAgentRun?.failurePayload ?? null,
      latestResultPayload: latestAgentRun?.resultPayload ?? null,
    }
  })
}
