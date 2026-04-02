import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const SectionCardContent = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("", className)} {...props} />
)
