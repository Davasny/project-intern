import type { ReactNode } from "react"
import { EmptyState } from "@/components/ui/empty-state/empty-state"

type DataTableEmptyStateProps = {
  action: ReactNode
  description: string
  icon?: ReactNode
  title: string
}

export const DataTableEmptyState = ({
  action,
  description,
  icon,
  title,
}: DataTableEmptyStateProps) => (
  <EmptyState
    action={action}
    description={description}
    icon={icon}
    title={title}
  />
)
