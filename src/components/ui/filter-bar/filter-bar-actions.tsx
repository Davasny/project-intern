import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const FilterBarActions = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-wrap items-center gap-2", className)}
    {...props}
  />
)
