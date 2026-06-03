import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { getInternRunStatusTooltipText } from "@/features/intern-runs/lib/get-intern-run-status-tooltip-text"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type GetInternRunByIdParams = {
  internRunId: string
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getInternRunById = async ({
  internRunId,
  organizationSlug,
  projectSlug,
  userId,
}: GetInternRunByIdParams) => {
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
      attemptNumber: internRunTable.attemptNumber,
      costUsd: internRunTable.costUsd,
      createdAt: internRunTable.createdAt,
      directory: internRunTable.directory,
      estimatedCostUsd: internRunTable.estimatedCostUsd,
      failurePayload: internRunTable.failurePayload,
      finishedAt: internRunTable.finishedAt,
      id: internRunTable.id,
      inputTokens: internRunTable.inputTokens,
      latencyMs: internRunTable.latencyMs,
      model: internRunTable.model,
      outputTokens: internRunTable.outputTokens,
      provider: internRunTable.provider,
      recordId: recordTable.id,
      recordName: recordTable.name,
      resultPayload: internRunTable.resultPayload,
      selectedIntern: internRunTable.selectedIntern,
      selectedModel: internRunTable.selectedModel,
      selectedTemperature: internRunTable.selectedTemperature,
      sessionReference: internRunTable.sessionReference,
      startedAt: internRunTable.startedAt,
      state: internRunTable.state,
      taskActivitySummary: internRunTable.toolActivitySummary,
      taskCallCount: internRunTable.toolCallCount,
      taskId: taskTable.id,
      workRecordId: internRunTable.workRecordId,
      taskTitle: taskTable.title,
      tokenInput: internRunTable.tokenInput,
      tokenOutput: internRunTable.tokenOutput,
      toolSummary: internRunTable.toolSummary,
      updatedAt: internRunTable.updatedAt,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(workRecordTable.recordId, recordTable.id))
    .where(
      and(
        eq(internRunTable.id, internRunId),
        eq(taskTable.projectId, project.id),
      ),
    )
    .limit(1)

  if (run.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Intern run not found.",
    })
  }

  const currentRun = run[0]

  const siblingRuns = await db
    .select({
      attemptNumber: internRunTable.attemptNumber,
      costUsd: internRunTable.costUsd,
      createdAt: internRunTable.createdAt,
      estimatedCostUsd: internRunTable.estimatedCostUsd,
      failurePayload: internRunTable.failurePayload,
      id: internRunTable.id,
      inputTokens: internRunTable.inputTokens,
      latencyMs: internRunTable.latencyMs,
      outputTokens: internRunTable.outputTokens,
      resultPayload: internRunTable.resultPayload,
      state: internRunTable.state,
      tokenInput: internRunTable.tokenInput,
      tokenOutput: internRunTable.tokenOutput,
    })
    .from(internRunTable)
    .where(eq(internRunTable.workRecordId, currentRun.workRecordId))
    .orderBy(desc(internRunTable.attemptNumber))

  return {
    ...currentRun,
    statusTooltipText: getInternRunStatusTooltipText({
      failurePayload: currentRun.failurePayload,
      resultPayload: currentRun.resultPayload,
    }),
    siblingRuns: siblingRuns.map((sibling) => ({
      attemptNumber: sibling.attemptNumber,
      costUsd: sibling.costUsd,
      createdAt: sibling.createdAt,
      estimatedCostUsd: sibling.estimatedCostUsd,
      id: sibling.id,
      inputTokens: sibling.inputTokens,
      latencyMs: sibling.latencyMs,
      outputTokens: sibling.outputTokens,
      state: sibling.state,
      statusTooltipText: getInternRunStatusTooltipText({
        failurePayload: sibling.failurePayload,
        resultPayload: sibling.resultPayload,
      }),
      tokenInput: sibling.tokenInput,
      tokenOutput: sibling.tokenOutput,
    })),
  }
}
