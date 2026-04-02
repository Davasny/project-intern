type GetTaskRecordPatchSchemaVersionParams = {
  recordSchemaVersion: number
  taskSchemaVersion: number
  taskTargetSchemaVersionId: string | null
}

export const getTaskRecordPatchSchemaVersion = ({
  recordSchemaVersion,
  taskSchemaVersion,
  taskTargetSchemaVersionId,
}: GetTaskRecordPatchSchemaVersionParams) =>
  taskTargetSchemaVersionId === null ? recordSchemaVersion : taskSchemaVersion
