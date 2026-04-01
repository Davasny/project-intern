import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const RelationListItem = ({
  className,
  ...props
}: HTMLAttributes<HTMLLIElement>) => (
  <li
    className={cn(
      "flex flex-col gap-4 rounded-2xl border border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] p-4",
      className,
    )}
    {...props}
  />
)
