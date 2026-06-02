import type {
  InternRunListRangeFilterColumnId,
  InternRunListTextFilterColumnId,
} from "@/features/intern-runs/lib/intern-run-list-filter-column"

export type InternRunListRangeFilterValue = {
  max: number | null
  min: number | null
}

export type InternRunListFilters = {
  ranges: Partial<
    Record<InternRunListRangeFilterColumnId, InternRunListRangeFilterValue>
  >
  text: Partial<Record<InternRunListTextFilterColumnId, string>>
}

export const emptyInternRunListFilters: InternRunListFilters = {
  ranges: {},
  text: {},
}
