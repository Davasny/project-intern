type RecordListSortColumnId =
  | "active"
  | "completed"
  | "failed"
  | "latestRun"
  | "record"
  | "relations"
  | "skipped"
  | "status"
  | "updated"
  | "usage"
  | "waiting"

export type RecordListSortColumnKey =
  | RecordListSortColumnId
  | `context:${string}`

type RecordListSortDirection = "asc" | "desc"

export type RecordListSort = {
  columnId: RecordListSortColumnKey
  direction: RecordListSortDirection
}

export const defaultRecordListSort: RecordListSort = {
  columnId: "record",
  direction: "asc",
}

const recordListSortColumnIds: readonly RecordListSortColumnId[] = [
  "record",
  "status",
  "completed",
  "usage",
  "active",
  "failed",
  "skipped",
  "waiting",
  "latestRun",
  "relations",
  "updated",
]

const recordListSortDirections: readonly RecordListSortDirection[] = [
  "asc",
  "desc",
]

const isRecordListSortColumnId = (
  value: string,
): value is RecordListSortColumnId =>
  recordListSortColumnIds.some((columnId) => columnId === value)

const isRecordListSortColumnKey = (
  value: string,
): value is RecordListSortColumnKey =>
  isRecordListSortColumnId(value) || value.startsWith("context:")

const isRecordListSortDirection = (
  value: string,
): value is RecordListSortDirection =>
  recordListSortDirections.some((direction) => direction === value)

export const parseRecordListSort = (value: string): RecordListSort => {
  const separatorIndex = value.lastIndexOf(":")

  if (separatorIndex === -1) {
    return defaultRecordListSort
  }

  const columnId = value.slice(0, separatorIndex)
  const direction = value.slice(separatorIndex + 1)

  return columnId.length > 0 &&
    isRecordListSortColumnKey(columnId) &&
    isRecordListSortDirection(direction)
    ? { columnId, direction }
    : defaultRecordListSort
}

export const serializeRecordListSort = (value: RecordListSort) =>
  `${value.columnId}:${value.direction}`

export const getContextRecordListSortColumnKey = (
  fieldKey: string,
): RecordListSortColumnKey => `context:${fieldKey}`

export const getNextRecordListSort = ({
  columnId,
  currentSort,
}: {
  columnId: RecordListSortColumnKey
  currentSort: RecordListSort
}): RecordListSort => {
  if (currentSort.columnId !== columnId) {
    return { columnId, direction: "asc" }
  }

  return {
    columnId,
    direction: currentSort.direction === "asc" ? "desc" : "asc",
  }
}
