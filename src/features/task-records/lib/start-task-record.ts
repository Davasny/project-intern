import { eq } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { db } from "@/lib/db"

type StartTaskRecordParams = {
  agentRunId: string
  taskRecordId: string
}

export const startTaskRecord = async ({
  agentRunId,
  taskRecordId,
}: StartTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("start")
  await db
    .update(taskRecordTable)
    .set({
      agentRunId,
      errorCode: null,
      lastTransitionAt: new Date(),
    })
    .where(eq(taskRecordTable.id, taskRecordId))
  return actor
}
