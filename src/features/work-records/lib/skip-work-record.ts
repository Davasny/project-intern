import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"

type SkipWorkRecordParams = {
  internRunId: string | null
  errorCode: string | null
  workRecordId: string
}

const skipNoopStates = ["completed", "skipped"]

export const skipWorkRecord = async ({
  internRunId,
  errorCode,
  workRecordId,
}: SkipWorkRecordParams) => {
  const actor = await getWorkRecordActor(workRecordId)

  if (skipNoopStates.includes(actor.state as (typeof skipNoopStates)[number])) {
    return
  }

  const lastTransitionAt = new Date()

  if (actor.nextEvents.includes("skip")) {
    return actor.send("skip", {
      internRunId,
      errorCode,
      lastTransitionAt,
    })
  }

  if (actor.nextEvents.includes("cancel")) {
    return actor.send("cancel", {
      internRunId,
      errorCode,
      lastTransitionAt,
    })
  }

  throw new Error(
    `Cannot skip work record ${workRecordId} in state ${actor.state}. Available events: ${actor.nextEvents.join(", ")}`,
  )
}
