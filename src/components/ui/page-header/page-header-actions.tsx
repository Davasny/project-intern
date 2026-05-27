import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const PageHeaderActions = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-wrap items-center gap-3", className)}
    {...props}
  />
)
