import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { taskRecordTable } from "@/features/task-records/db"
import { claimTaskRecord } from "@/features/task-records/lib/claim-task-record"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type CreateAgentRunParams = {
  selectedAgent: string | null
  selectedModel: string | null
  taskRecordId: string
}

export const createAgentRun = async ({
  selectedAgent,
  selectedModel,
  taskRecordId,
}: CreateAgentRunParams) => {
  const taskRecord = await db
    .select({
      id: taskRecordTable.id,
      recordId: taskRecordTable.recordId,
      taskId: taskRecordTable.taskId,
    })
    .from(taskRecordTable)
    .where(eq(taskRecordTable.id, taskRecordId))
    .then((rows) => rows[0] ?? null)

  if (!taskRecord) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task record was not found.",
    })
  }

  const task = await db
    .select({ model: taskTable.model })
    .from(taskTable)
    .where(eq(taskTable.id, taskRecord.taskId))
    .then((rows) => rows[0] ?? null)

  const latestAgentRun = await db
    .select({ attemptNumber: agentRunTable.attemptNumber })
    .from(agentRunTable)
    .where(eq(agentRunTable.taskRecordId, taskRecordId))
    .orderBy(desc(agentRunTable.attemptNumber))
    .then((rows) => rows[0] ?? null)

  const [agentRun] = await db
    .insert(agentRunTable)
    .values({
      attemptNumber: latestAgentRun ? latestAgentRun.attemptNumber + 1 : 1,
      costUsd: null,
      failurePayload: null,
      latencyMs: null,
      resultPayload: null,
      selectedAgent,
      selectedModel: selectedModel ?? task?.model ?? null,
      sessionReference: null,
      state: "created",
      taskRecordId,
      tokenInput: null,
      tokenOutput: null,
      toolActivitySummary: {},
    })
    .returning({
      attemptNumber: agentRunTable.attemptNumber,
      id: agentRunTable.id,
      selectedAgent: agentRunTable.selectedAgent,
      selectedModel: agentRunTable.selectedModel,
      state: agentRunTable.state,
      taskRecordId: agentRunTable.taskRecordId,
    })

  const claimedTaskRecord = await claimTaskRecord({
    agentRunId: agentRun.id,
    taskRecordId,
  })

  if (!claimedTaskRecord) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task record could not be claimed.",
    })
  }

  return agentRun
}
