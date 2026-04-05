import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"

type CompleteTaskRecordParams = {
  agentRunId: string
  taskRecordId: string
}

export const completeTaskRecord = async ({
  agentRunId,
  taskRecordId,
}: CompleteTaskRecordParams) => {
  const actor = await getTaskRecordActor(taskRecordId)
  return actor.send("complete", {
    agentRunId,
    lastTransitionAt: new Date(),
  })
}
