import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const SectionCardContent = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("", className)} {...props} />
)
