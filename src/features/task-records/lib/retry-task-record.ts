import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"

export const retryTaskRecord = async (taskRecordId: string) => {
  const actor = await getTaskRecordActor(taskRecordId)
  await actor.send("retry")
  return actor
}
