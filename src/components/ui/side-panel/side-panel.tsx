import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const SidePanel = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-4 rounded-3xl border border-border bg-card p-6",
      className,
    )}
    {...props}
  />
)
