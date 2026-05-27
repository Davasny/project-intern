import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type GetAgentRunByIdParams = {
  agentRunId: string
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getAgentRunById = async ({
  agentRunId,
  organizationSlug,
  projectSlug,
  userId,
}: GetAgentRunByIdParams) => {
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

  const run = await db
    .select({
      attemptNumber: agentRunTable.attemptNumber,
      costUsd: agentRunTable.costUsd,
      createdAt: agentRunTable.createdAt,
      directory: agentRunTable.directory,
      estimatedCostUsd: agentRunTable.estimatedCostUsd,
      failurePayload: agentRunTable.failurePayload,
      finishedAt: agentRunTable.finishedAt,
      id: agentRunTable.id,
      inputTokens: agentRunTable.inputTokens,
      latencyMs: agentRunTable.latencyMs,
      model: agentRunTable.model,
      outputTokens: agentRunTable.outputTokens,
      provider: agentRunTable.provider,
      recordId: recordTable.id,
      recordName: recordTable.name,
      resultPayload: agentRunTable.resultPayload,
      selectedAgent: agentRunTable.selectedAgent,
      selectedModel: agentRunTable.selectedModel,
      selectedTemperature: agentRunTable.selectedTemperature,
      sessionReference: agentRunTable.sessionReference,
      startedAt: agentRunTable.startedAt,
      state: agentRunTable.state,
      taskActivitySummary: agentRunTable.toolActivitySummary,
      taskCallCount: agentRunTable.toolCallCount,
      taskId: taskTable.id,
      taskRecordId: agentRunTable.taskRecordId,
      taskTitle: taskTable.title,
      tokenInput: agentRunTable.tokenInput,
      tokenOutput: agentRunTable.tokenOutput,
      toolSummary: agentRunTable.toolSummary,
      updatedAt: agentRunTable.updatedAt,
    })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .where(
      and(
        eq(agentRunTable.id, agentRunId),
        eq(taskTable.projectId, project.id),
      ),
    )
    .limit(1)

  if (run.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent run not found.",
    })
  }

  const currentRun = run[0]

  const siblingRuns = await db
    .select({
      attemptNumber: agentRunTable.attemptNumber,
      createdAt: agentRunTable.createdAt,
      id: agentRunTable.id,
      state: agentRunTable.state,
    })
    .from(agentRunTable)
    .where(eq(agentRunTable.taskRecordId, currentRun.taskRecordId))
    .orderBy(desc(agentRunTable.attemptNumber))

  return {
    ...currentRun,
    siblingRuns: siblingRuns.map((sibling) => ({
      attemptNumber: sibling.attemptNumber,
      createdAt: sibling.createdAt,
      id: sibling.id,
      state: sibling.state,
    })),
  }
}
