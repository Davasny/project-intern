import { createWorkRecordMachineContext } from "@/features/work-records/lib/create-work-record-machine-context"
import { workRecordMachine } from "@/features/work-records/lib/work-record-machine"

type CreateWorkRecordMachineRowParams = {
  id: string
  recordId: string
  taskId: string
}

const isDatabaseConflictError = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false
  }

  return error.code === "23505"
}

export const createWorkRecordMachineRow = async ({
  id,
  recordId,
  taskId,
}: CreateWorkRecordMachineRowParams) => {
  try {
    return await workRecordMachine.createActor(
      id,
      createWorkRecordMachineContext({ recordId, taskId }),
    )
  } catch (error) {
    if (isDatabaseConflictError(error)) {
      return null
    }

    throw error
  }
}
