import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const SectionCardHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2", className)} {...props} />
)
