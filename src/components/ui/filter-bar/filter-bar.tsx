import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const FilterBar = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between",
      className,
    )}
    {...props}
  />
)
