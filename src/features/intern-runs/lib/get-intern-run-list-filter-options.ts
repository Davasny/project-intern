import { getInternRunListFilterValue } from "@/features/intern-runs/lib/get-intern-run-list-filter-value"
import type { InternRunListTextFilterColumnId } from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type { InternRunListItem } from "@/features/intern-runs/lib/intern-run-list-item"

export const getInternRunListFilterOptions = ({
  columnId,
  runs,
}: {
  columnId: InternRunListTextFilterColumnId
  runs: Array<InternRunListItem>
}) => {
  const options = new Set<string>()

  for (const run of runs) {
    options.add(getInternRunListFilterValue({ columnId, run }))
  }

  return Array.from(options).sort((firstOption, secondOption) =>
    firstOption.localeCompare(secondOption),
  )
}
