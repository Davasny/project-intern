import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const UsageBreakdownCardDescription = ({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)
