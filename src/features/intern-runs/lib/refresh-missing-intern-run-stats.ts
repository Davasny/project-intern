import type { OpencodeClient } from "@opencode-ai/sdk"
import { and, eq, isNotNull, isNull, or } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { updateInternRunMetrics } from "@/features/intern-runs/lib/update-intern-run-metrics"
import { getSessionMetrics } from "@/features/opencode/lib/get-session-metrics"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const missingStatsBatchLimit = 50

type RefreshMissingInternRunStatsResult = {
  checkedCount: number
  failedCount: number
  skippedCount: number
  updatedCount: number
}

const hasRefreshableMetrics = ({
  costUsd,
  inputTokens,
  latencyMs,
  outputTokens,
  toolCallCount,
}: {
  costUsd: number | null
  inputTokens: number | null
  latencyMs: number | null
  outputTokens: number | null
  toolCallCount: number
}) =>
  costUsd !== null ||
  inputTokens !== null ||
  latencyMs !== null ||
  outputTokens !== null ||
  toolCallCount > 0

export const refreshMissingInternRunStats = async ({
  client,
  projectId,
}: {
  client: OpencodeClient
  projectId: string
}): Promise<RefreshMissingInternRunStatsResult> => {
  const runs = await db
    .select({
      id: internRunTable.id,
      sessionReference: internRunTable.sessionReference,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskTable.projectId, projectId),
        isNotNull(internRunTable.sessionReference),
        or(
          isNull(internRunTable.costUsd),
          isNull(internRunTable.inputTokens),
          isNull(internRunTable.outputTokens),
          isNull(internRunTable.latencyMs),
        ),
      ),
    )
    .limit(missingStatsBatchLimit)

  let failedCount = 0
  let skippedCount = 0
  let updatedCount = 0

  for (const run of runs) {
    if (run.sessionReference === null) {
      skippedCount++
      continue
    }

    try {
      const metrics = await getSessionMetrics({
        client,
        fallbackLatencyMs: null,
        sessionId: run.sessionReference,
      })

      if (!metrics || !hasRefreshableMetrics(metrics)) {
        skippedCount++
        continue
      }

      await updateInternRunMetrics({
        internRunId: run.id,
        costUsd: metrics.costUsd,
        inputTokens: metrics.inputTokens,
        latencyMs: metrics.latencyMs,
        outputTokens: metrics.outputTokens,
        toolCallCount: metrics.toolCallCount,
      })

      updatedCount++
    } catch (error) {
      failedCount++
      logger.warn(
        {
          error,
          internRunId: run.id,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        "Failed to refresh missing intern run stats",
      )
    }
  }

  return {
    checkedCount: runs.length,
    failedCount,
    skippedCount,
    updatedCount,
  }
}
