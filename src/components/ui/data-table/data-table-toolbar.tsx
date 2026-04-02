import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const DataTableToolbar = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between",
      className,
    )}
    {...props}
  />
)
