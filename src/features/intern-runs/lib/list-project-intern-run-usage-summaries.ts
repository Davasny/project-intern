import { eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { addInternRunUsage } from "@/features/intern-runs/lib/add-intern-run-usage"
import { calculateInternRunDurationMs } from "@/features/intern-runs/lib/calculate-intern-run-duration-ms"
import {
  emptyInternRunUsageSummary,
  type InternRunUsageSummary,
} from "@/features/intern-runs/lib/intern-run-usage-summary"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type ListProjectInternRunUsageSummariesParams = {
  projectId: string
}

export const listProjectInternRunUsageSummaries = async ({
  projectId,
}: ListProjectInternRunUsageSummariesParams) => {
  const rows = await db
    .select({
      cachedInputTokens: internRunTable.cachedInputTokens,
      cacheWriteTokens: internRunTable.cacheWriteTokens,
      costUsd: internRunTable.costUsd,
      estimatedCostUsd: internRunTable.estimatedCostUsd,
      finishedAt: internRunTable.finishedAt,
      inputTokens: internRunTable.inputTokens,
      latencyMs: internRunTable.latencyMs,
      outputTokens: internRunTable.outputTokens,
      recordId: workRecordTable.recordId,
      taskId: workRecordTable.taskId,
      tokenInput: internRunTable.tokenInput,
      tokenOutput: internRunTable.tokenOutput,
      startedAt: internRunTable.startedAt,
      workRecordId: workRecordTable.id,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(eq(taskTable.projectId, projectId))

  const projectUsage = emptyInternRunUsageSummary()
  const taskUsageMap = new Map<string, InternRunUsageSummary>()
  const recordUsageMap = new Map<string, InternRunUsageSummary>()
  const workRecordUsageMap = new Map<string, InternRunUsageSummary>()

  for (const row of rows) {
    const taskUsage =
      taskUsageMap.get(row.taskId) ?? emptyInternRunUsageSummary()
    const recordUsage =
      recordUsageMap.get(row.recordId) ?? emptyInternRunUsageSummary()
    const workRecordUsage =
      workRecordUsageMap.get(row.workRecordId) ?? emptyInternRunUsageSummary()

    for (const summary of [
      projectUsage,
      taskUsage,
      recordUsage,
      workRecordUsage,
    ]) {
      addInternRunUsage({
        summary,
        cachedInputTokens: row.cachedInputTokens,
        cacheWriteTokens: row.cacheWriteTokens,
        costUsd: row.costUsd,
        durationMs: calculateInternRunDurationMs({
          finishedAt: row.finishedAt,
          latencyMs: row.latencyMs,
          startedAt: row.startedAt,
        }),
        estimatedCostUsd: row.estimatedCostUsd,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        tokenInput: row.tokenInput,
        tokenOutput: row.tokenOutput,
      })
    }

    taskUsageMap.set(row.taskId, taskUsage)
    recordUsageMap.set(row.recordId, recordUsage)
    workRecordUsageMap.set(row.workRecordId, workRecordUsage)
  }

  return {
    projectUsage,
    recordUsageMap,
    taskUsageMap,
    workRecordUsageMap,
  }
}
