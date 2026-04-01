import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const AppShellHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-between gap-3 border-b border-[var(--app-border-soft)] pb-4",
      className,
    )}
    {...props}
  />
)
