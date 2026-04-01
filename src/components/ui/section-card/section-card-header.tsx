import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const SectionCardHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6",
      className,
    )}
    {...props}
  />
)
