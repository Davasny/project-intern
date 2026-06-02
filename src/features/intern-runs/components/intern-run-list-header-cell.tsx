import { TableHeader } from "@/components/ui/table"
import { InternRunListColumnFilterButton } from "@/features/intern-runs/components/intern-run-list-column-filter-button"
import { InternRunListRangeFilterButton } from "@/features/intern-runs/components/intern-run-list-range-filter-button"
import type { InternRunListRangeFilterBounds } from "@/features/intern-runs/lib/get-intern-run-list-range-filter-bounds"
import type {
  InternRunListRangeFilterColumnId,
  InternRunListTextFilterColumnId,
} from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type { InternRunListRangeFilterValue } from "@/features/intern-runs/lib/intern-run-list-filters"

type InternRunListTextHeaderCellProps = {
  columnId: InternRunListTextFilterColumnId
  filterValue: string
  kind: "text"
  label: string
  onFilterChange: (columnId: InternRunListTextFilterColumnId, value: string) => void
  options: Array<string>
}

type InternRunListRangeHeaderCellProps = {
  bounds: InternRunListRangeFilterBounds
  columnId: InternRunListRangeFilterColumnId
  filterValue: InternRunListRangeFilterValue | undefined
  kind: "range"
  label: string
  onFilterChange: (
    columnId: InternRunListRangeFilterColumnId,
    value: InternRunListRangeFilterValue | undefined,
  ) => void
}

type InternRunListHeaderCellProps =
  | InternRunListTextHeaderCellProps
  | InternRunListRangeHeaderCellProps

export const InternRunListHeaderCell = (props: InternRunListHeaderCellProps) => (
  <TableHeader>
    <div className="flex items-center gap-1.5">
      <span>{props.label}</span>
      {props.kind === "text" ? (
        <InternRunListColumnFilterButton
          columnId={props.columnId}
          filterValue={props.filterValue}
          label={props.label}
          onFilterChange={props.onFilterChange}
          options={props.options}
        />
      ) : (
        <InternRunListRangeFilterButton
          bounds={props.bounds}
          columnId={props.columnId}
          filterValue={props.filterValue}
          label={props.label}
          onFilterChange={props.onFilterChange}
        />
      )}
    </div>
  </TableHeader>
)
