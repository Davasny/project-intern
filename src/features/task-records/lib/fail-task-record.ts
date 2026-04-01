import { eq } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { db } from "@/lib/db"

type FailTaskRecordParams = {
  agentRunId: string | null
  errorCode: string
  taskRecordId: string
}

export const failTaskRecord = async ({
  agentRunId,
  errorCode,
  taskRecordId,
}: FailTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("fail")
  await db
    .update(taskRecordTable)
    .set({
      agentRunId,
      errorCode,
      lastTransitionAt: new Date(),
    })
    .where(eq(taskRecordTable.id, taskRecordId))
  return actor
}
