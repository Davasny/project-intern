import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const UsageBreakdownCardTitle = ({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold text-foreground", className)} {...props} />
)
