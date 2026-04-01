import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const AppShell = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("min-h-screen bg-[var(--app-background)]", className)}
    {...props}
  />
)
