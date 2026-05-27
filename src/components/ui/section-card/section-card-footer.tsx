import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const SectionCardFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props} />
)
