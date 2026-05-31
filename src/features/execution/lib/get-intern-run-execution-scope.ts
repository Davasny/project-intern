import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { getWorkRecordExecutionScope } from "@/features/execution/lib/get-work-record-execution-scope"
import { internRunTable } from "@/features/intern-runs/db"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type GetInternRunExecutionScopeParams = {
  internRunId: string
}

export const getInternRunExecutionScope = async ({
  internRunId,
}: GetInternRunExecutionScopeParams) => {
  const scopeSeed = await db
    .select({
      internRunId: internRunTable.id,
      projectId: taskTable.projectId,
      recordId: workRecordTable.recordId,
      taskId: workRecordTable.taskId,
      workRecordId: workRecordTable.id,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(workRecordTable.recordId, recordTable.id))
    .where(eq(internRunTable.id, internRunId))
    .then((rows) => rows[0] ?? null)

  if (!scopeSeed) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Intern run was not found.",
    })
  }

  return getWorkRecordExecutionScope(scopeSeed)
}
