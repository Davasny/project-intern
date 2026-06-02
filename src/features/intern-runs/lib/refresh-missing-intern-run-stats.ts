import type { OpencodeClient } from "@opencode-ai/sdk"
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { syncSessionMetricsToInternRun } from "@/features/intern-runs/lib/sync-session-metrics-to-intern-run"
import {
  activeInternRunStates,
  isInternRunStateActive,
} from "@/features/intern-runs/schemas/intern-run-state"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const missingStatsBatchLimit = 50

type RefreshMissingInternRunStatsResult = {
  activeUpdatedCount: number
  checkedCount: number
  failedCount: number
  skippedCount: number
  updatedCount: number
}

export const refreshMissingInternRunStats = async ({
  client,
  projectId,
}: {
  client: OpencodeClient
  projectId: string
}): Promise<RefreshMissingInternRunStatsResult> => {
  const runs = await db
    .select({
      directory: internRunTable.directory,
      id: internRunTable.id,
      sessionReference: internRunTable.sessionReference,
      state: internRunTable.state,
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
          inArray(internRunTable.state, activeInternRunStates),
          isNull(internRunTable.costUsd),
          isNull(internRunTable.inputTokens),
          isNull(internRunTable.outputTokens),
          isNull(internRunTable.latencyMs),
        ),
      ),
    )
    .limit(missingStatsBatchLimit)

  let activeUpdatedCount = 0
  let failedCount = 0
  let skippedCount = 0
  let updatedCount = 0

  for (const run of runs) {
    if (run.sessionReference === null) {
      skippedCount++
      continue
    }

    const log = logger.child({ internRunId: run.id, projectId })
    const result = await syncSessionMetricsToInternRun({
      client,
      directory: run.directory,
      fallbackLatencyMs: null,
      internRunId: run.id,
      log,
      sessionId: run.sessionReference,
      trigger: "manual",
    })

    if (result.reason === "failed") {
      failedCount++
      continue
    }

    if (!result.synced) {
      skippedCount++
      continue
    }

    updatedCount++

    if (isInternRunStateActive(run.state)) {
      activeUpdatedCount++
    }
  }

  return {
    activeUpdatedCount,
    checkedCount: runs.length,
    failedCount,
    skippedCount,
    updatedCount,
  }
}
