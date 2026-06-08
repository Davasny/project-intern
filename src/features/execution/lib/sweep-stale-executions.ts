import { and, eq, inArray, lt } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { failInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { activeInternRunStates } from "@/features/intern-runs/schemas/intern-run-state"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const sweepStaleExecutions = async (): Promise<{
  sweptCount: number
  internRunIds: string[]
}> => {
  const threshold = new Date(Date.now() - 10 * 60 * 1000)

  const staleRuns = await db
    .select({
      internRunId: internRunTable.id,
      workRecordId: workRecordTable.id,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .where(
      and(
        inArray(internRunTable.state, activeInternRunStates),
        lt(internRunTable.updatedAt, threshold),
      ),
    )

  if (staleRuns.length === 0) {
    return { sweptCount: 0, internRunIds: [] }
  }

  logger.info(
    { staleCount: staleRuns.length },
    "Found stale execution intern runs on startup",
  )

  const sweptInternRunIds: string[] = []

  for (const run of staleRuns) {
    try {
      await failInternRunCommand({
        internRunId: run.internRunId,
        cachedInputTokens: null,
        cacheWriteTokens: null,
        costUsd: null,
        errorCode: "STALE_EXECUTION",
        failurePayload: {
          code: "STALE_EXECUTION",
          reason: "Execution intern run was stale and has been cleaned up",
          retryable: true,
        },
        latencyMs: null,
        workRecordId: run.workRecordId,
        tokenInput: null,
        tokenOutput: null,
        toolActivitySummary: {},
      })

      sweptInternRunIds.push(run.internRunId)
    } catch (error) {
      logger.warn(
        {
          internRunId: run.internRunId,
          workRecordId: run.workRecordId,
          error,
        },
        "Failed to sweep stale execution intern run, skipping",
      )
    }
  }

  logger.info(
    { sweptCount: sweptInternRunIds.length, total: staleRuns.length },
    "Completed stale execution intern run sweep",
  )

  return {
    sweptCount: sweptInternRunIds.length,
    internRunIds: sweptInternRunIds,
  }
}
