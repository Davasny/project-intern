import type { ReactNode } from "react"
import { EmptyState } from "@/components/ui/empty-state/empty-state"

type DataTableEmptyStateProps = {
  description: string
  title: string
  action: ReactNode
}

export const DataTableEmptyState = ({
  action,
  description,
  title,
}: DataTableEmptyStateProps) => (
  <EmptyState action={action} description={description} title={title} />
)
