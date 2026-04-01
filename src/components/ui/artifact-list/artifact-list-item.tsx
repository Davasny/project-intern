import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

type ArtifactListItemProps = {
  meta: ReactNode
  title: string
}

export const ArtifactListItem = ({ meta, title }: ArtifactListItemProps) => (
  <Card className="flex flex-col gap-2 p-4">
    <div className="text-sm font-medium text-slate-950">{title}</div>
    <div className="text-sm text-slate-500">{meta}</div>
  </Card>
)
