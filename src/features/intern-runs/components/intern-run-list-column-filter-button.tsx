import type { ChangeEvent } from "react"
import { FilterIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { InternRunListTextFilterColumnId } from "@/features/intern-runs/lib/intern-run-list-filter-column"
import { cn } from "@/lib/utils"

type InternRunListColumnFilterButtonProps = {
  columnId: InternRunListTextFilterColumnId
  filterValue: string
  label: string
  onFilterChange: (columnId: InternRunListTextFilterColumnId, value: string) => void
  options: Array<string>
}

export const InternRunListColumnFilterButton = ({
  columnId,
  filterValue,
  label,
  onFilterChange,
  options,
}: InternRunListColumnFilterButtonProps) => {
  const isActive = filterValue.trim().length > 0
  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFilterChange(columnId, event.target.value)
  }
  const handleFilterClear = () => {
    onFilterChange(columnId, "")
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
      <DropdownMenuContent align="end" className="flex w-64 flex-col gap-2 p-2">
        <DropdownMenuLabel className="px-1 py-0 text-xs text-muted-foreground">
          Filter {label}
        </DropdownMenuLabel>
        <Input
          aria-label={`${label} filter value`}
          autoFocus={true}
          onChange={handleFilterChange}
          placeholder={`Contains ${label.toLowerCase()}`}
          value={filterValue}
        />
        {options.length > 0 ? (
          <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
            {options.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => onFilterChange(columnId, option)}
              >
                <span className="truncate">{option}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <Button
          disabled={!isActive}
          onClick={handleFilterClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-3.5" />
          Clear filter
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
