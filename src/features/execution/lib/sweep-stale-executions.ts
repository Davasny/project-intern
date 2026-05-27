import { and, eq, inArray, lt } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { failAgentRunCommand } from "@/features/agent-runs/lib/agent-run-commands"
import { activeAgentRunStates } from "@/features/agent-runs/schemas/agent-run-state"
import { taskRecordTable } from "@/features/task-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const sweepStaleExecutions = async (): Promise<{
  sweptCount: number
  agentRunIds: string[]
}> => {
  const threshold = new Date(Date.now() - 10 * 60 * 1000)

  const staleRuns = await db
    .select({
      agentRunId: agentRunTable.id,
      taskRecordId: taskRecordTable.id,
    })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .where(
      and(
        inArray(agentRunTable.state, activeAgentRunStates),
        lt(agentRunTable.updatedAt, threshold),
      ),
    )

  if (staleRuns.length === 0) {
    return { sweptCount: 0, agentRunIds: [] }
  }

  logger.info(
    { staleCount: staleRuns.length },
    "Found stale execution agent runs on startup",
  )

  const sweptAgentRunIds: string[] = []

  for (const run of staleRuns) {
    try {
      await failAgentRunCommand({
        agentRunId: run.agentRunId,
        costUsd: null,
        errorCode: "STALE_EXECUTION",
        failurePayload: {
          code: "STALE_EXECUTION",
          message: "Execution agent run was stale and has been cleaned up",
          retryable: true,
        },
        latencyMs: null,
        taskRecordId: run.taskRecordId,
        tokenInput: null,
        tokenOutput: null,
        toolActivitySummary: {},
      })

      sweptAgentRunIds.push(run.agentRunId)
    } catch (error) {
      logger.warn(
        {
          agentRunId: run.agentRunId,
          taskRecordId: run.taskRecordId,
          error,
        },
        "Failed to sweep stale execution agent run, skipping",
      )
    }
  }

  logger.info(
    { sweptCount: sweptAgentRunIds.length, total: staleRuns.length },
    "Completed stale execution agent run sweep",
  )

  return { sweptCount: sweptAgentRunIds.length, agentRunIds: sweptAgentRunIds }
}
