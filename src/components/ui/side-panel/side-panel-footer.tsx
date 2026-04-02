import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const SidePanelFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("pt-4", className)} {...props} />
)
