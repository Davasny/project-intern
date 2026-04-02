import { withDrizzlePg } from "machin/drizzle/pg"
import { taskRecordTable } from "@/features/task-records/db"
import { createTaskRecordMachineContext } from "@/features/task-records/lib/create-task-record-machine-context"
import { taskRecordMachineDefinition } from "@/features/task-records/lib/task-record-machine"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "insert" | "select" | "update">

type CreateTaskRecordMachineRowParams = {
  database: DatabaseClient
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
  database,
  id,
  recordId,
  taskId,
}: CreateTaskRecordMachineRowParams) => {
  const taskRecordMachine = withDrizzlePg(taskRecordMachineDefinition, {
    db: database,
    table: taskRecordTable,
  })

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
