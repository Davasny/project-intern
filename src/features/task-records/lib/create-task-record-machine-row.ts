import { createTaskRecordMachineContext } from "@/features/task-records/lib/create-task-record-machine-context"
import { taskRecordMachine } from "@/features/task-records/lib/task-record-machine"

type CreateTaskRecordMachineRowParams = {
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

export const createTaskRecordMachineRow = async ({
  id,
  recordId,
  taskId,
}: CreateTaskRecordMachineRowParams) => {
  try {
    return await taskRecordMachine.createActor(
      id,
      createTaskRecordMachineContext({ recordId, taskId }),
    )
  } catch (error) {
    if (isDatabaseConflictError(error)) {
      return null
    }

    throw error
  }
}
