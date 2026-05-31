import { TRPCError } from "@trpc/server"
import { workRecordMachine } from "@/features/work-records/lib/work-record-machine"

export const getWorkRecordActor = async (workRecordId: string) => {
  const actor = await workRecordMachine.getActor(workRecordId)

  if (!actor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Work record was not found.",
    })
  }

  return actor
}
