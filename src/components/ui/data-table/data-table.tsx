import type { ReactNode } from "react"
import { Table } from "@/components/ui/table"

type DataTableProps = {
  ariaLabel?: string
  children: ReactNode
}

export const DataTable = ({ ariaLabel, children }: DataTableProps) => (
  <div
    aria-label={ariaLabel}
    className="overflow-hidden rounded-2xl border border-border bg-card"
  >
    <div className="overflow-x-auto">
      <Table>{children}</Table>
    </div>
  </div>
)
