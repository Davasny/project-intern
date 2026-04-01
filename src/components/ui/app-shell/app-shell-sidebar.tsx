import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const AppShellSidebar = ({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) => (
  <aside
    className={cn(
      "flex flex-col gap-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm",
      className,
    )}
    {...props}
  />
)
