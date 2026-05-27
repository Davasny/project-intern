import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const AppShellSidebar = ({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) => (
  <aside
    className={cn(
      "flex flex-col gap-6 rounded-3xl border border-border bg-card p-4",
      className,
    )}
    {...props}
  />
)
