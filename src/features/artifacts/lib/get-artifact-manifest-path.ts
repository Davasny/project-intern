import path from "node:path"
import { backendConfig } from "@/lib/config/backend"

type GetArtifactManifestPathParams = {
  projectId: string
  recordId: string
}

export const getArtifactManifestPath = ({
  projectId,
  recordId,
}: GetArtifactManifestPathParams) =>
  path.join(
    backendConfig.CRM_STORAGE_ROOT,
    `project_${projectId}`,
    `record_${recordId}`,
    "artifacts",
    "manifest.json",
  )
