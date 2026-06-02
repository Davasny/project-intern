import { getInternRunListFilterValue } from "@/features/intern-runs/lib/get-intern-run-list-filter-value"
import { getInternRunListRangeFilterValue } from "@/features/intern-runs/lib/get-intern-run-list-range-filter-value"
import {
  internRunListRangeFilterColumnIds,
  internRunListTextFilterColumnIds,
} from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type { InternRunListFilters } from "@/features/intern-runs/lib/intern-run-list-filters"
import type { InternRunListItem } from "@/features/intern-runs/lib/intern-run-list-item"

const normalizeFilterText = (value: string) => value.trim().toLowerCase()

export const getInternRunListVisibleRuns = ({
  filters,
  runs,
}: {
  filters: InternRunListFilters
  runs: Array<InternRunListItem>
}) =>
  runs.filter(
    (run) =>
      internRunListTextFilterColumnIds.every((columnId) => {
        const filterValue = normalizeFilterText(filters.text[columnId] ?? "")

        if (filterValue.length === 0) {
          return true
        }

        return normalizeFilterText(
          getInternRunListFilterValue({ columnId, run }),
        ).includes(filterValue)
      }) &&
      internRunListRangeFilterColumnIds.every((columnId) => {
        const rangeFilter = filters.ranges[columnId]

        if (!rangeFilter) {
          return true
        }

        const value = getInternRunListRangeFilterValue({ columnId, run })

        if (value === null) {
          return false
        }

        if (rangeFilter.min !== null && value < rangeFilter.min) {
          return false
        }

        return rangeFilter.max === null || value <= rangeFilter.max
      }),
  )
