import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

const completedStates = ["completed", "failed"] as const

type PreviousTaskExecution = {
  taskTitle: string
  state: string
  resultSummary: string | null
  finishedAt: string | null
  attemptNumber: number
}

const extractSummary = (
  resultPayload: Record<string, unknown> | null,
  failurePayload: Record<string, unknown> | null,
): string | null => {
  const payload = resultPayload ?? failurePayload

  if (!payload || Object.keys(payload).length === 0) {
    return null
  }

  const summaryField =
    (payload.summary as string | undefined) ??
    (payload.message as string | undefined) ??
    (payload.error as string | undefined)

  if (summaryField !== undefined) {
    return String(summaryField).slice(0, 120)
  }

  return JSON.stringify(payload).slice(0, 120)
}

type GetPreviousTaskExecutionsForRecordParams = {
  recordId: string
  excludeAgentRunId: string
}

export const getPreviousTaskExecutionsForRecord = async ({
  recordId,
  excludeAgentRunId,
}: GetPreviousTaskExecutionsForRecordParams): Promise<
  PreviousTaskExecution[]
> => {
  const rows = await db
    .select({
      taskTitle: taskTable.title,
      state: agentRunTable.state,
      resultPayload: agentRunTable.resultPayload,
      failurePayload: agentRunTable.failurePayload,
      finishedAt: agentRunTable.finishedAt,
      attemptNumber: agentRunTable.attemptNumber,
    })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskRecordTable.recordId, recordId),
        ne(agentRunTable.id, excludeAgentRunId),
        inArray(agentRunTable.state, completedStates),
        isNotNull(agentRunTable.finishedAt),
      ),
    )
    .orderBy(desc(agentRunTable.finishedAt))
    .limit(5)

  return rows.map((row) => ({
    taskTitle: row.taskTitle,
    state: row.state,
    resultSummary: extractSummary(row.resultPayload, row.failurePayload),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    attemptNumber: row.attemptNumber,
  }))
}
