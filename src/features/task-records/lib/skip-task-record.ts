import { eq } from "drizzle-orm"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { db } from "@/lib/db"

type SkipTaskRecordParams = {
  agentRunId: string | null
  errorCode: string | null
  taskRecordId: string
}

export const skipTaskRecord = async ({
  agentRunId,
  errorCode,
  taskRecordId,
}: SkipTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)

  if (actor.state === "waiting" || actor.state === "failed") {
    await actor.send("skip")
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

  await actor.send("cancel")
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
