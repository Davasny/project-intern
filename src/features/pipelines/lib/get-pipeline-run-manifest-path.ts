import path from "node:path"
import { backendConfig } from "@/lib/config/backend"

type GetPipelineRunManifestPathParams = {
  projectId: string
  recordId: string
}

export const getPipelineRunManifestPath = ({
  projectId,
  recordId,
}: GetPipelineRunManifestPathParams) =>
  path.join(
    backendConfig.CRM_STORAGE_ROOT,
    `project_${projectId}`,
    `record_${recordId}`,
    "pipeline-runs.json",
  )
