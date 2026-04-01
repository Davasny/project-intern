import { and, asc, eq, inArray, ne, notExists } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { agentRunTable } from "@/features/agent-runs/db"
import { taskRecordTable } from "@/features/task-records/db"
import { retryTaskRecord } from "@/features/task-records/lib/retry-task-record"
import { activeTaskRecordStates } from "@/features/task-records/schemas/task-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type RunTaskRetryScanParams = {
  limit: number
}

export const runTaskRetryScan = async ({ limit }: RunTaskRetryScanParams) => {
  const blockingTaskRecordTable = alias(taskRecordTable, "blocking_task_record")
  const activeAgentRunTaskRecordTable = alias(
    taskRecordTable,
    "active_agent_run_task_record",
  )

  const retryableTaskRecords = await db
    .select({
      taskRecordId: taskRecordTable.id,
    })
    .from(taskRecordTable)
    .where(
      and(
        eq(taskRecordTable.state, "failed"),
        notExists(
          db
            .select({ id: blockingTaskRecordTable.id })
            .from(blockingTaskRecordTable)
            .where(
              and(
                eq(blockingTaskRecordTable.recordId, taskRecordTable.recordId),
                ne(blockingTaskRecordTable.id, taskRecordTable.id),
                inArray(blockingTaskRecordTable.state, activeTaskRecordStates),
              ),
            ),
        ),
        notExists(
          db
            .select({ id: agentRunTable.id })
            .from(agentRunTable)
            .innerJoin(
              activeAgentRunTaskRecordTable,
              eq(agentRunTable.taskRecordId, activeAgentRunTaskRecordTable.id),
            )
            .where(
              and(
                eq(
                  activeAgentRunTaskRecordTable.recordId,
                  taskRecordTable.recordId,
                ),
                inArray(agentRunTable.state, [
                  "created",
                  "booting",
                  "running",
                  "persisting_outputs",
                ]),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(taskRecordTable.lastTransitionAt))
    .limit(limit)

  const retriedTaskRecordIds: string[] = []

  for (const retryableTaskRecord of retryableTaskRecords) {
    await retryTaskRecord(retryableTaskRecord.taskRecordId)
    retriedTaskRecordIds.push(retryableTaskRecord.taskRecordId)
  }

  logger.info(
    {
      retriedCount: retriedTaskRecordIds.length,
      taskRecordIds: retriedTaskRecordIds,
    },
    "Completed retry scan",
  )

  return {
    retriedCount: retriedTaskRecordIds.length,
    taskRecordIds: retriedTaskRecordIds,
  }
}
