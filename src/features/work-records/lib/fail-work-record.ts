import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"

type FailWorkRecordParams = {
  internRunId: string | null
  errorCode: string
  workRecordId: string
}

export const failWorkRecord = async ({
  internRunId,
  errorCode,
  workRecordId,
}: FailWorkRecordParams) => {
  const actor = await getWorkRecordActor(workRecordId)
  return actor.send("fail", {
    internRunId,
    errorCode,
    lastTransitionAt: new Date(),
  })
}
