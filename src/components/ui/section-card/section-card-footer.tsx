import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const SectionCardFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("border-t border-[var(--app-border-soft)] p-6", className)}
    {...props}
  />
)
