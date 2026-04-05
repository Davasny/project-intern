import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"

type StartTaskRecordParams = {
  agentRunId: string
  taskRecordId: string
}

export const startTaskRecord = async ({
  agentRunId,
  taskRecordId,
}: StartTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)
  return actor.send("start", {
    agentRunId,
    lastTransitionAt: new Date(),
  })
}
