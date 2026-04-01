import path from "node:path"
import { backendConfig } from "@/lib/config/backend"

type GetRecordFilesManifestPathParams = {
  projectId: string
  recordId: string
}

export const getRecordFilesManifestPath = ({
  projectId,
  recordId,
}: GetRecordFilesManifestPathParams) =>
  path.join(
    backendConfig.CRM_STORAGE_ROOT,
    `project_${projectId}`,
    `record_${recordId}`,
    "files",
    "manifest.json",
  )
