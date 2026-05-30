import { RecordFileTreeNodeItem } from "@/features/files/components/record-file-tree-node-item"
import type { RecordFileTreeNode } from "@/lib/storage/record-file-tree-node"

type RecordFileTreeProps = {
  nodes: Array<RecordFileTreeNode>
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const RecordFileTree = ({
  nodes,
  organizationSlug,
  projectSlug,
  recordId,
}: RecordFileTreeProps) => (
  <div className="flex flex-col gap-3">
    {nodes.map((node) => (
      <RecordFileTreeNodeItem
        key={node.path}
        node={node}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordId}
      />
    ))}
  </div>
)
