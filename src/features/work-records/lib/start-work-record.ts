import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"

type StartWorkRecordParams = {
  internRunId: string
  workRecordId: string
}

export const startWorkRecord = async ({
  internRunId,
  workRecordId,
}: StartWorkRecordParams) => {
  const actor = await getWorkRecordActor(workRecordId)
  return actor.send("start", {
    internRunId,
    lastTransitionAt: new Date(),
  })
}
