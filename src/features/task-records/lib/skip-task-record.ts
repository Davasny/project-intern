import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"

type SkipTaskRecordParams = {
  agentRunId: string | null
  errorCode: string | null
  taskRecordId: string
}

const skipNoopStates = ["completed", "skipped"]

export const skipTaskRecord = async ({
  agentRunId,
  errorCode,
  taskRecordId,
}: SkipTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)

  if (skipNoopStates.includes(actor.state as (typeof skipNoopStates)[number])) {
    return
  }

  const lastTransitionAt = new Date()

  if (actor.nextEvents.includes("skip")) {
    return actor.send("skip", {
      agentRunId,
      errorCode,
      lastTransitionAt,
    })
  }

  if (actor.nextEvents.includes("cancel")) {
    return actor.send("cancel", {
      agentRunId,
      errorCode,
      lastTransitionAt,
    })
  }

  throw new Error(
    `Cannot skip task record ${taskRecordId} in state ${actor.state}. Available events: ${actor.nextEvents.join(", ")}`,
  )
}
