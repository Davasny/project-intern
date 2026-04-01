import { TRPCError } from "@trpc/server"
import { taskRecordMachine } from "@/features/task-records/lib/task-record-machine"

export const getTaskRecordActor = async (taskRecordId: string) => {
  const actor = await taskRecordMachine.getActor(taskRecordId)

  if (!actor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task record was not found.",
    })
  }

  return actor
}
