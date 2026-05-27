import type { HTMLAttributes } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const SectionCard = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <Card
    className={cn("rounded-xl px-6 py-4 flex flex-col gap-3", className)}
    {...props}
  />
)
