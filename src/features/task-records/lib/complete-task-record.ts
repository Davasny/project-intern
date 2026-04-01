import { eq } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { db } from "@/lib/db"

type CompleteTaskRecordParams = {
  agentRunId: string
  taskRecordId: string
}

export const completeTaskRecord = async ({
  agentRunId,
  taskRecordId,
}: CompleteTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("complete")
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
