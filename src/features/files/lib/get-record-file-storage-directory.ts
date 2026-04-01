import path from "node:path"
import { backendConfig } from "@/lib/config/backend"

type GetRecordFileStorageDirectoryParams = {
  projectId: string
  recordId: string
}

export const getRecordFileStorageDirectory = ({
  projectId,
  recordId,
}: GetRecordFileStorageDirectoryParams) =>
  path.join(
    backendConfig.CRM_STORAGE_ROOT,
    `project_${projectId}`,
    `record_${recordId}`,
    "files",
  )
