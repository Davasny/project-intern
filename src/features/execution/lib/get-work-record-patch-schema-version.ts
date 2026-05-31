type GetWorkRecordPatchSchemaVersionParams = {
  recordSchemaVersion: number
  taskSchemaVersion: number
  taskTargetSchemaVersionId: string | null
}

export const getWorkRecordPatchSchemaVersion = ({
  recordSchemaVersion,
  taskSchemaVersion,
  taskTargetSchemaVersionId,
}: GetWorkRecordPatchSchemaVersionParams) =>
  taskTargetSchemaVersionId === null ? recordSchemaVersion : taskSchemaVersion
