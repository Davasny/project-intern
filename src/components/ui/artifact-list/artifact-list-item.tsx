import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

type ArtifactListItemProps = {
  meta: ReactNode
  title: string
}

export const ArtifactListItem = ({ meta, title }: ArtifactListItemProps) => (
  <Card className="flex flex-col gap-2 p-4">
    <div className="text-foreground text-sm font-medium">{title}</div>
    <div className="text-muted-foreground text-sm">{meta}</div>
  </Card>
)
