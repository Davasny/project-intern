import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const FilterBar = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between",
      className,
    )}
    {...props}
  />
)
