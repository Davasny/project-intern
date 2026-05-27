import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const PageHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <header className={cn("flex flex-col gap-4", className)} {...props} />
)
