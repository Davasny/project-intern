import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"

export const retryTaskRecord = async (taskRecordId: string) => {
  const actor = await getTaskRecordActor(taskRecordId)
  return actor.send("retry", {
    agentRunId: actor.context.agentRunId,
    errorCode: null,
    lastTransitionAt: new Date(),
  })
}
