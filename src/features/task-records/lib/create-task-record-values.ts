import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

type CreateTaskRecordValuesParams = {
  recordId: string
  taskId: string
}

type CreateTaskRecordValuesResult = {
  agentRunId: null
  errorCode: null
  lastTransitionAt: Date
  recordId: string
  state: TaskRecordState
  taskId: string
}

export const createTaskRecordValues = ({
  recordId,
  taskId,
}: CreateTaskRecordValuesParams): CreateTaskRecordValuesResult => ({
  agentRunId: null,
  errorCode: null,
  lastTransitionAt: new Date(),
  recordId,
  state: "waiting" satisfies TaskRecordState,
  taskId,
})
