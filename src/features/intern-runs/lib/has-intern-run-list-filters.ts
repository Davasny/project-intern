import {
  internRunListRangeFilterColumnIds,
  internRunListTextFilterColumnIds,
} from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type { InternRunListFilters } from "@/features/intern-runs/lib/intern-run-list-filters"

export const hasInternRunListFilters = (filters: InternRunListFilters) =>
  internRunListTextFilterColumnIds.some(
    (columnId) => (filters.text[columnId] ?? "").trim().length > 0,
  ) ||
  internRunListRangeFilterColumnIds.some((columnId) => {
    const rangeFilter = filters.ranges[columnId]

    return rangeFilter !== undefined
  })
