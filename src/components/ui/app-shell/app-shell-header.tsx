import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const AppShellHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between gap-3 pb-4", className)}
    {...props}
  />
)
