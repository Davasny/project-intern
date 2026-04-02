import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const SectionCardHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />
)
