type CreateWorkRecordMachineContextParams = {
  recordId: string
  taskId: string
}

export const createWorkRecordMachineContext = ({
  recordId,
  taskId,
}: CreateWorkRecordMachineContextParams) => ({
  internRunId: null,
  errorCode: null,
  lastTransitionAt: new Date(),
  recordId,
  taskId,
})
