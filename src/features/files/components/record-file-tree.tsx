import { RecordFileTreeNodeItem } from "@/features/files/components/record-file-tree-node-item"
import type { RecordFileTreeNode } from "@/lib/storage/record-file-tree-node"

type RecordFileTreeProps = {
  nodes: Array<RecordFileTreeNode>
}

export const RecordFileTree = ({ nodes }: RecordFileTreeProps) => (
  <div className="flex flex-col gap-3">
    {nodes.map((node) => (
      <RecordFileTreeNodeItem key={node.path} node={node} />
    ))}
  </div>
)
