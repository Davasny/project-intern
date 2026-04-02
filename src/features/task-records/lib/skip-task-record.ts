import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"

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
  const lastTransitionAt = new Date()

  if (actor.state === "waiting" || actor.state === "failed") {
    return actor.send("skip", {
      agentRunId,
      errorCode,
      lastTransitionAt,
    })
  }

  return actor.send("cancel", {
    agentRunId,
    errorCode,
    lastTransitionAt,
  })
}
