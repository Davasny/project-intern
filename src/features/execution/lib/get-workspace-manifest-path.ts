import path from "node:path"
import { getRecordWorkspaceDirectory } from "@/features/execution/lib/get-record-workspace-directory"

type GetWorkspaceManifestPathParams = {
  projectId: string
  recordId: string
}

export const getWorkspaceManifestPath = ({
  projectId,
  recordId,
}: GetWorkspaceManifestPathParams) =>
  path.join(
    getRecordWorkspaceDirectory({ projectId, recordId }),
    "workspace.json",
  )
