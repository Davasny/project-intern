import { TRPCError } from "@trpc/server"
import { and, eq, inArray, ne } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { activeTaskRecordStates } from "@/features/task-records/schemas/task-record-state"
import { db } from "@/lib/db"

type ClaimTaskRecordParams = {
  agentRunId: string
  taskRecordId: string
}

export const claimTaskRecord = async ({
  agentRunId,
  taskRecordId,
}: ClaimTaskRecordParams) => {
  const taskRecord = await db
    .select({
      id: taskRecordTable.id,
      recordId: taskRecordTable.recordId,
      state: taskRecordTable.state,
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

  const blockingTaskRecord = await db
    .select({ id: taskRecordTable.id })
    .from(taskRecordTable)
    .where(
      and(
        eq(taskRecordTable.recordId, taskRecord.recordId),
        ne(taskRecordTable.id, taskRecord.id),
        inArray(taskRecordTable.state, activeTaskRecordStates),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (blockingTaskRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Another task is already active for this record.",
    })
  }

  if (taskRecord.state !== "waiting") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only waiting task records can be claimed.",
    })
  }

  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("claim")
  await db
    .update(taskRecordTable)
    .set({
      agentRunId,
      errorCode: null,
      lastTransitionAt: new Date(),
    })
    .where(eq(taskRecordTable.id, taskRecordId))

  return db
    .select({
      agentRunId: taskRecordTable.agentRunId,
      errorCode: taskRecordTable.errorCode,
      id: taskRecordTable.id,
      lastTransitionAt: taskRecordTable.lastTransitionAt,
      recordId: taskRecordTable.recordId,
      state: taskRecordTable.state,
      taskId: taskRecordTable.taskId,
    })
    .from(taskRecordTable)
    .where(eq(taskRecordTable.id, taskRecordId))
    .then((rows) => rows[0] ?? null)
}
