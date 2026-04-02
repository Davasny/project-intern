import type { ReactNode } from "react"
import { Table } from "@/components/ui/table"

type DataTableProps = {
  children: ReactNode
}

export const DataTable = ({ children }: DataTableProps) => (
  <div className="overflow-hidden rounded-3xl border border-border bg-card">
    <div className="overflow-x-auto">
      <Table>{children}</Table>
    </div>
  </div>
)
