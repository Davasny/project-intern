import type { HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const RelationList = ({
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) => (
  <ul className={cn("flex flex-col gap-4", className)} {...props} />
)
