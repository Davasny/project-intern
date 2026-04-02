import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

type FileListItemProps = {
  meta: ReactNode
  title: string
}

export const FileListItem = ({ meta, title }: FileListItemProps) => (
  <Card className="flex flex-col gap-2 p-4">
    <div className="text-foreground text-sm font-medium">{title}</div>
    <div className="text-muted-foreground text-sm">{meta}</div>
  </Card>
)
