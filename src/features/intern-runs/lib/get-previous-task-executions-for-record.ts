import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
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
  excludeInternRunId: string
}

export const getPreviousTaskExecutionsForRecord = async ({
  recordId,
  excludeInternRunId,
}: GetPreviousTaskExecutionsForRecordParams): Promise<
  PreviousTaskExecution[]
> => {
  const rows = await db
    .select({
      taskTitle: taskTable.title,
      state: internRunTable.state,
      resultPayload: internRunTable.resultPayload,
      failurePayload: internRunTable.failurePayload,
      finishedAt: internRunTable.finishedAt,
      attemptNumber: internRunTable.attemptNumber,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(workRecordTable.recordId, recordId),
        ne(internRunTable.id, excludeInternRunId),
        inArray(internRunTable.state, completedStates),
        isNotNull(internRunTable.finishedAt),
      ),
    )
    .orderBy(desc(internRunTable.finishedAt))
    .limit(5)

  return rows.map((row) => ({
    taskTitle: row.taskTitle,
    state: row.state,
    resultSummary: extractSummary(row.resultPayload, row.failurePayload),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    attemptNumber: row.attemptNumber,
  }))
}
