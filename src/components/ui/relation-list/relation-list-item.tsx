import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const RelationListItem = ({
  className,
  ...props
}: HTMLAttributes<HTMLLIElement>) => (
  <li
    className={cn(
      "flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-4",
      className,
    )}
    {...props}
  />
)
