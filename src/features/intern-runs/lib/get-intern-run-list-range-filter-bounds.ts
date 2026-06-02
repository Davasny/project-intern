import { getInternRunListRangeFilterValue } from "@/features/intern-runs/lib/get-intern-run-list-range-filter-value"
import type { InternRunListRangeFilterColumnId } from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type { InternRunListItem } from "@/features/intern-runs/lib/intern-run-list-item"

export type InternRunListRangeFilterBounds = {
  max: number
  min: number
  step: number
}

const getStep = (columnId: InternRunListRangeFilterColumnId) =>
  columnId === "temperature" || columnId === "cost" || columnId === "duration"
    ? 0.1
    : 1

export const getInternRunListRangeFilterBounds = ({
  columnId,
  runs,
}: {
  columnId: InternRunListRangeFilterColumnId
  runs: Array<InternRunListItem>
}): InternRunListRangeFilterBounds => {
  const values = runs
    .map((run) => getInternRunListRangeFilterValue({ columnId, run }))
    .filter((value): value is number => value !== null)

  if (values.length === 0) {
    return { max: 0, min: 0, step: getStep(columnId) }
  }

  return {
    max: Math.max(...values),
    min: Math.min(...values),
    step: getStep(columnId),
  }
}
