import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type ListAgentRunsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listAgentRuns = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListAgentRunsParams) => {
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
      attemptNumber: agentRunTable.attemptNumber,
      costUsd: agentRunTable.costUsd,
      createdAt: agentRunTable.createdAt,
      estimatedCostUsd: agentRunTable.estimatedCostUsd,
      finishedAt: agentRunTable.finishedAt,
      id: agentRunTable.id,
      inputTokens: agentRunTable.inputTokens,
      latencyMs: agentRunTable.latencyMs,
      model: agentRunTable.model,
      outputTokens: agentRunTable.outputTokens,
      provider: agentRunTable.provider,
      recordId: recordTable.id,
      recordName: recordTable.name,
      selectedAgent: agentRunTable.selectedAgent,
      selectedModel: agentRunTable.selectedModel,
      sessionReference: agentRunTable.sessionReference,
      startedAt: agentRunTable.startedAt,
      state: agentRunTable.state,
      taskCallCount: agentRunTable.toolCallCount,
      taskId: taskTable.id,
      taskRecordId: agentRunTable.taskRecordId,
      taskTitle: taskTable.title,
      tokenInput: agentRunTable.tokenInput,
      tokenOutput: agentRunTable.tokenOutput,
      updatedAt: agentRunTable.updatedAt,
    })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .where(eq(taskTable.projectId, project.id))
    .orderBy(desc(agentRunTable.createdAt))

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
    selectedAgent: run.selectedAgent,
    selectedModel: run.selectedModel,
    sessionReference: run.sessionReference,
    startedAt: run.startedAt,
    state: run.state,
    taskCallCount: run.taskCallCount,
    taskId: run.taskId,
    taskRecordId: run.taskRecordId,
    taskTitle: run.taskTitle,
    tokenInput: run.tokenInput,
    tokenOutput: run.tokenOutput,
    updatedAt: run.updatedAt,
  }))
}
