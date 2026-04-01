import { eq } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { db } from "@/lib/db"

export const retryTaskRecord = async (taskRecordId: string) => {
  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("retry")
  await db
    .update(taskRecordTable)
    .set({
      errorCode: null,
      lastTransitionAt: new Date(),
    })
    .where(eq(taskRecordTable.id, taskRecordId))
  return actor
}
