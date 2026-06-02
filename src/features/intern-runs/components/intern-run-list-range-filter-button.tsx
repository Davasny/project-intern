import { FilterIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { InternRunListRangeFilterColumnId } from "@/features/intern-runs/lib/intern-run-list-filter-column"
import type {
  InternRunListRangeFilterBounds,
} from "@/features/intern-runs/lib/get-intern-run-list-range-filter-bounds"
import type { InternRunListRangeFilterValue } from "@/features/intern-runs/lib/intern-run-list-filters"
import { cn } from "@/lib/utils"

type InternRunListRangeFilterButtonProps = {
  bounds: InternRunListRangeFilterBounds
  columnId: InternRunListRangeFilterColumnId
  filterValue: InternRunListRangeFilterValue | undefined
  label: string
  onFilterChange: (
    columnId: InternRunListRangeFilterColumnId,
    value: InternRunListRangeFilterValue | undefined,
  ) => void
}

const formatRangeValue = (value: number) =>
  Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)

export const InternRunListRangeFilterButton = ({
  bounds,
  columnId,
  filterValue,
  label,
  onFilterChange,
}: InternRunListRangeFilterButtonProps) => {
  const selectedMax = filterValue?.max ?? bounds.max
  const isDisabled = bounds.min === bounds.max
  const isActive = Boolean(filterValue)
  const handleSliderChange = (value: string) => {
    const max = Number(value)
    onFilterChange(columnId, {
      max,
      min: bounds.min,
    })
  }
  const handleFilterClear = () => {
    onFilterChange(columnId, undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button
          aria-label={`Filter ${label}`}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            isActive ? "border-primary/40 bg-primary/10 text-primary" : "",
          )}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <FilterIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex w-72 flex-col gap-3 p-3">
        <DropdownMenuLabel className="px-0 py-0 text-xs text-muted-foreground">
          Filter {label}
        </DropdownMenuLabel>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{formatRangeValue(bounds.min)}</span>
          <span>{formatRangeValue(selectedMax)}</span>
        </div>
        <div className="flex flex-col gap-2">
          <input
            aria-label={`${label} maximum value`}
            className="accent-primary"
            disabled={isDisabled}
            max={bounds.max}
            min={bounds.min}
            onChange={(event) => handleSliderChange(event.target.value)}
            step={bounds.step}
            type="range"
            value={selectedMax}
          />
        </div>
        <DropdownMenuSeparator />
        <Button
          disabled={!isActive}
          onClick={handleFilterClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-3.5" />
          Clear range
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
