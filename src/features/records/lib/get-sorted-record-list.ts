import type { RecordListRecord } from "@/features/records/lib/record-list-record"
import type { RecordListSort } from "@/features/records/lib/record-list-sort"

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

const compareText = (left: string, right: string) =>
  textCollator.compare(left, right)

const compareNumber = (left: number, right: number) => left - right

const compareNullableText = (left: string | null, right: string | null) => {
  if (left === null && right === null) {
    return 0
  }

  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  return compareText(left, right)
}

const stringifyContextValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  return JSON.stringify(value)
}

const compareRecordsByColumn = ({
  left,
  right,
  sort,
}: {
  left: RecordListRecord
  right: RecordListRecord
  sort: RecordListSort
}) => {
  if (sort.columnId.startsWith("context:")) {
    const fieldKey = sort.columnId.replace("context:", "")

    return compareText(
      stringifyContextValue(left.context[fieldKey]),
      stringifyContextValue(right.context[fieldKey]),
    )
  }

  switch (sort.columnId) {
    case "active":
      return compareNumber(
        left.progress.inProgressCount,
        right.progress.inProgressCount,
      )
    case "completed": {
      const completedResult = compareNumber(
        left.progress.completedCount,
        right.progress.completedCount,
      )

      return completedResult === 0
        ? compareNumber(left.progress.totalCount, right.progress.totalCount)
        : completedResult
    }
    case "failed":
      return compareNumber(
        left.progress.failedCount,
        right.progress.failedCount,
      )
    case "latestRun":
      return compareNullableText(
        left.activeRun?.state ?? null,
        right.activeRun?.state ?? null,
      )
    case "record":
      return compareText(left.name, right.name)
    case "relations":
      return compareNumber(
        left.relationSummary.activeCount,
        right.relationSummary.activeCount,
      )
    case "skipped":
      return compareNumber(
        left.progress.skippedCount,
        right.progress.skippedCount,
      )
    case "status":
      return compareText(left.state, right.state)
    case "updated":
      return compareNumber(left.updatedAt.getTime(), right.updatedAt.getTime())
    case "usage": {
      const costResult = compareNumber(
        left.usage.totalCostUsd,
        right.usage.totalCostUsd,
      )

      return costResult === 0
        ? compareNumber(left.usage.totalTokens, right.usage.totalTokens)
        : costResult
    }
    case "waiting":
      return compareNumber(
        left.progress.waitingCount,
        right.progress.waitingCount,
      )
  }

  return 0
}

export const getSortedRecordList = ({
  records,
  sort,
}: {
  records: RecordListRecord[]
  sort: RecordListSort
}) =>
  [...records].sort((left, right) => {
    const sortResult = compareRecordsByColumn({ left, right, sort })
    const directedSortResult =
      sort.direction === "asc" ? sortResult : sortResult * -1

    if (directedSortResult !== 0) {
      return directedSortResult
    }

    const nameResult = compareText(left.name, right.name)

    return nameResult === 0 ? compareText(left.id, right.id) : nameResult
  })
