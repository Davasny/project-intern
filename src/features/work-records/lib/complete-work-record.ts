import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"

type CompleteWorkRecordParams = {
  internRunId: string
  workRecordId: string
}

export const completeWorkRecord = async ({
  internRunId,
  workRecordId,
}: CompleteWorkRecordParams) => {
  const actor = await getWorkRecordActor(workRecordId)
  return actor.send("complete", {
    internRunId,
    lastTransitionAt: new Date(),
  })
}
