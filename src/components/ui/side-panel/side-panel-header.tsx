import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const SidePanelHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1", className)} {...props} />
)
