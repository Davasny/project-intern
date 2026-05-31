import { and, asc, eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import type { SessionDumpScope } from "@/features/opencode/schemas/session-dump-scope"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
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
    filters.push(eq(workRecordTable.taskId, scope.taskId))
  }

  if (scope.recordId) {
    filters.push(eq(workRecordTable.recordId, scope.recordId))
  }

  return db
    .select({
      internRunId: internRunTable.id,
      attemptNumber: internRunTable.attemptNumber,
      costUsd: internRunTable.costUsd,
      directory: internRunTable.directory,
      failurePayload: internRunTable.failurePayload,
      finishedAt: internRunTable.finishedAt,
      model: internRunTable.model,
      provider: internRunTable.provider,
      recordContext: recordTable.context,
      recordId: recordTable.id,
      recordName: recordTable.name,
      resultPayload: internRunTable.resultPayload,
      selectedIntern: internRunTable.selectedIntern,
      selectedModel: internRunTable.selectedModel,
      selectedTemperature: internRunTable.selectedTemperature,
      sessionReference: internRunTable.sessionReference,
      startedAt: internRunTable.startedAt,
      state: internRunTable.state,
      taskDescriptionMarkdown: taskTable.descriptionMarkdown,
      taskId: taskTable.id,
      workRecordId: workRecordTable.id,
      taskSortOrder: taskTable.sortOrder,
      taskTitle: taskTable.title,
      toolCallCount: internRunTable.toolCallCount,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(workRecordTable.recordId, recordTable.id))
    .where(and(...filters))
    .orderBy(
      asc(taskTable.sortOrder),
      asc(recordTable.name),
      asc(internRunTable.attemptNumber),
    )
}

export type SessionDumpRun = Awaited<
  ReturnType<typeof listSessionDumpRuns>
>[number]
