import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { TableHeader } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TableSortDirection = "asc" | "desc"

type TableSortHeaderProps = Omit<ComponentProps<"th">, "children"> & {
  children: ReactNode
  direction: TableSortDirection | null
  onSort: () => void
}

const getAriaSort = (direction: TableSortDirection | null) => {
  if (direction === "asc") {
    return "ascending"
  }

  if (direction === "desc") {
    return "descending"
  }

  return "none"
}

export const TableSortHeader = ({
  children,
  className,
  direction,
  onSort,
  ...props
}: TableSortHeaderProps) => (
  <TableHeader aria-sort={getAriaSort(direction)} className={className} {...props}>
    <button
      className={cn(
        "flex flex-row items-center gap-2 rounded-md text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        direction === null ? "text-muted-foreground" : "text-foreground",
      )}
      onClick={onSort}
      type="button"
    >
      <span>{children}</span>
      {direction === "asc" ? (
        <ArrowUpIcon className="size-3.5" />
      ) : direction === "desc" ? (
        <ArrowDownIcon className="size-3.5" />
      ) : (
        <ArrowUpDownIcon className="size-3.5 opacity-60" />
      )}
    </button>
  </TableHeader>
)
