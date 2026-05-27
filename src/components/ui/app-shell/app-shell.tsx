import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const AppShell = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-screen bg-background", className)} {...props} />
)
