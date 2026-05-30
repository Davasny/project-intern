import type { ReactNode } from "react"
import { Table } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableProps = {
  ariaLabel?: string
  children: ReactNode
  className?: string
  tableClassName?: string
}

export const DataTable = ({
  ariaLabel,
  children,
  className,
  tableClassName,
}: DataTableProps) => (
  <div
    aria-label={ariaLabel}
    className={cn(
      "w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card",
      className,
    )}
  >
    <div className="w-full min-w-0 max-w-full overflow-x-auto">
      <Table className={tableClassName}>{children}</Table>
    </div>
  </div>
)
