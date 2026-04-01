import type { HTMLAttributes } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/utils/cn"

export const SectionCard = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <Card className={cn("rounded-3xl", className)} {...props} />
)
