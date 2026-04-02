type CreateTaskRecordMachineContextParams = {
  recordId: string
  taskId: string
}

export const createTaskRecordMachineContext = ({
  recordId,
  taskId,
}: CreateTaskRecordMachineContextParams) => ({
  agentRunId: null,
  errorCode: null,
  lastTransitionAt: new Date(),
  recordId,
  taskId,
})
