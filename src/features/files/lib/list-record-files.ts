import { listRecordFileTree } from "@/lib/storage/list-record-file-tree"
import type { RecordFileTreeNode } from "@/lib/storage/record-file-tree-node"

type ListRecordFilesParams = {
  organizationId: string
  projectId: string
  recordId: string
}

const collectFileNodes = (
  nodes: Array<RecordFileTreeNode>,
): Array<Extract<RecordFileTreeNode, { kind: "file" }>> => {
  return nodes.flatMap((node) => {
    if (node.kind === "directory") {
      return collectFileNodes(node.children)
    }

    return [node]
  })
}

export const listRecordFiles = async ({
  organizationId,
  projectId,
  recordId,
}: ListRecordFilesParams) => {
  const tree = await listRecordFileTree({
    organizationId,
    projectId,
    recordId,
  })

  return collectFileNodes(tree).sort((a, b) => a.path.localeCompare(b.path))
}
