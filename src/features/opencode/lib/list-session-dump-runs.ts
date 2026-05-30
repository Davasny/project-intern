import { and, asc, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import type { SessionDumpScope } from "@/features/opencode/schemas/session-dump-scope"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

export const listSessionDumpRuns = async ({
  projectId,
  scope,
}: {
  projectId: string
  scope: SessionDumpScope
}) => {
  const filters = [eq(taskTable.projectId, projectId)]

  if (scope.taskId) {
    filters.push(eq(taskRecordTable.taskId, scope.taskId))
  }

  if (scope.recordId) {
    filters.push(eq(taskRecordTable.recordId, scope.recordId))
  }

  return db
    .select({
      agentRunId: agentRunTable.id,
      attemptNumber: agentRunTable.attemptNumber,
      costUsd: agentRunTable.costUsd,
      directory: agentRunTable.directory,
      failurePayload: agentRunTable.failurePayload,
      finishedAt: agentRunTable.finishedAt,
      model: agentRunTable.model,
      provider: agentRunTable.provider,
      recordContext: recordTable.context,
      recordId: recordTable.id,
      recordName: recordTable.name,
      resultPayload: agentRunTable.resultPayload,
      selectedAgent: agentRunTable.selectedAgent,
      selectedModel: agentRunTable.selectedModel,
      selectedTemperature: agentRunTable.selectedTemperature,
      sessionReference: agentRunTable.sessionReference,
      startedAt: agentRunTable.startedAt,
      state: agentRunTable.state,
      taskDescriptionMarkdown: taskTable.descriptionMarkdown,
      taskId: taskTable.id,
      taskRecordId: taskRecordTable.id,
      taskSortOrder: taskTable.sortOrder,
      taskTitle: taskTable.title,
      toolCallCount: agentRunTable.toolCallCount,
    })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .where(and(...filters))
    .orderBy(
      asc(taskTable.sortOrder),
      asc(recordTable.name),
      asc(agentRunTable.attemptNumber),
    )
}

export type SessionDumpRun = Awaited<
  ReturnType<typeof listSessionDumpRuns>
>[number]
