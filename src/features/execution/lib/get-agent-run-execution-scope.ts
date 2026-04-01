import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type GetAgentRunExecutionScopeParams = {
  agentRunId: string
}

export const getAgentRunExecutionScope = async ({
  agentRunId,
}: GetAgentRunExecutionScopeParams) => {
  const scopeSeed = await db
    .select({
      agentRunId: agentRunTable.id,
      projectId: taskTable.projectId,
      recordId: taskRecordTable.recordId,
      taskId: taskRecordTable.taskId,
      taskRecordId: taskRecordTable.id,
    })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .where(eq(agentRunTable.id, agentRunId))
    .then((rows) => rows[0] ?? null)

  if (!scopeSeed) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent run was not found.",
    })
  }

  return getTaskRecordExecutionScope(scopeSeed)
}
