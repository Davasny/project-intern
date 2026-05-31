import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type ListInternRunsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listInternRuns = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListInternRunsParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const runs = await db
    .select({
      attemptNumber: internRunTable.attemptNumber,
      costUsd: internRunTable.costUsd,
      createdAt: internRunTable.createdAt,
      estimatedCostUsd: internRunTable.estimatedCostUsd,
      finishedAt: internRunTable.finishedAt,
      id: internRunTable.id,
      inputTokens: internRunTable.inputTokens,
      latencyMs: internRunTable.latencyMs,
      model: internRunTable.model,
      outputTokens: internRunTable.outputTokens,
      provider: internRunTable.provider,
      recordId: recordTable.id,
      recordName: recordTable.name,
      selectedIntern: internRunTable.selectedIntern,
      selectedModel: internRunTable.selectedModel,
      selectedTemperature: internRunTable.selectedTemperature,
      sessionReference: internRunTable.sessionReference,
      startedAt: internRunTable.startedAt,
      state: internRunTable.state,
      taskCallCount: internRunTable.toolCallCount,
      taskId: taskTable.id,
      workRecordId: internRunTable.workRecordId,
      taskTitle: taskTable.title,
      tokenInput: internRunTable.tokenInput,
      tokenOutput: internRunTable.tokenOutput,
      updatedAt: internRunTable.updatedAt,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(workRecordTable.recordId, recordTable.id))
    .where(eq(taskTable.projectId, project.id))
    .orderBy(desc(internRunTable.createdAt))

  return runs.map((run) => ({
    attemptNumber: run.attemptNumber,
    costUsd: run.costUsd,
    createdAt: run.createdAt,
    estimatedCostUsd: run.estimatedCostUsd,
    finishedAt: run.finishedAt,
    id: run.id,
    inputTokens: run.inputTokens,
    latencyMs: run.latencyMs,
    model: run.model,
    outputTokens: run.outputTokens,
    provider: run.provider,
    recordId: run.recordId,
    recordName: run.recordName,
    selectedIntern: run.selectedIntern,
    selectedModel: run.selectedModel,
    selectedTemperature: run.selectedTemperature,
    sessionReference: run.sessionReference,
    startedAt: run.startedAt,
    state: run.state,
    taskCallCount: run.taskCallCount,
    taskId: run.taskId,
    workRecordId: run.workRecordId,
    taskTitle: run.taskTitle,
    tokenInput: run.tokenInput,
    tokenOutput: run.tokenOutput,
    updatedAt: run.updatedAt,
  }))
}
