const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const getInternRunRecordStringValue = ({
  key,
  record,
}: {
  key: string
  record: Record<string, unknown> | null
}): string | null => {
  if (!record) {
    return null
  }

  const value = record[key]

  if (typeof value === "string" && value.trim().length > 0) {
    return value
  }

  if (isRecord(value)) {
    return getInternRunRecordStringValue({ key: "text", record: value })
  }

  return null
}
