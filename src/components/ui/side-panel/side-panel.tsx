import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const SidePanel = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-4 rounded-2xl border border-border bg-card p-6",
      className,
    )}
    {...props}
  />
)
