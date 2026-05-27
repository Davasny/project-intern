import { FileTextIcon, FolderIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { RecordFileTreeNode } from "@/lib/storage/record-file-tree-node"
import { formatFileSize } from "@/utils/format-file-size"

type RecordFileTreeNodeItemProps = {
  node: RecordFileTreeNode
}

export const RecordFileTreeNodeItem = ({
  node,
}: RecordFileTreeNodeItemProps) => {
  return node.kind === "directory" ? (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center gap-2 text-sm font-medium text-foreground">
        <FolderIcon className="size-4" />
        <span>{node.name}</span>
      </div>
      <div className="flex flex-col gap-2 border-l border-border pl-4">
        {node.children.map((childNode) => (
          <RecordFileTreeNodeItem key={childNode.path} node={childNode} />
        ))}
      </div>
    </div>
  ) : (
    <Card className="flex flex-col gap-1 p-3">
      <div className="flex flex-row items-center gap-2 text-sm font-medium text-foreground">
        <FileTextIcon className="size-4" />
        <span>{node.name}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {node.path} · {formatFileSize(node.sizeBytes)} ·{" "}
        {node.updatedAt.toLocaleString()}
      </div>
    </Card>
  )
}
