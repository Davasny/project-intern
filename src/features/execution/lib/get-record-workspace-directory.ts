import path from "node:path"
import { backendConfig } from "@/lib/config/backend"

type GetRecordWorkspaceDirectoryParams = {
  projectId: string
  recordId: string
}

export const getRecordWorkspaceDirectory = ({
  projectId,
  recordId,
}: GetRecordWorkspaceDirectoryParams) =>
  path.join(
    backendConfig.CRM_WORKSPACE_ROOT,
    `project_${projectId}`,
    `record_${recordId}`,
  )
