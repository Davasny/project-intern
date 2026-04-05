import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"

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
  return actor.send("fail", {
    agentRunId,
    errorCode,
    lastTransitionAt: new Date(),
  })
}
