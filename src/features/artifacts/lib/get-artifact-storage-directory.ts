import path from "node:path"
import { backendConfig } from "@/lib/config/backend"

type GetArtifactStorageDirectoryParams = {
  projectId: string
  recordId: string
}

export const getArtifactStorageDirectory = ({
  projectId,
  recordId,
}: GetArtifactStorageDirectoryParams) =>
  path.join(
    backendConfig.CRM_STORAGE_ROOT,
    `project_${projectId}`,
    `record_${recordId}`,
    "artifacts",
  )
