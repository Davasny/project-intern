import { getWorkspaceManifestPath } from "@/features/execution/lib/get-workspace-manifest-path"
import { workspaceManifestSchema } from "@/features/execution/schemas/workspace-manifest"
import { pathExists } from "@/utils/path-exists"
import { readJsonFile } from "@/utils/read-json-file"

type ReadWorkspaceManifestParams = {
  projectId: string
  recordId: string
}

export const readWorkspaceManifest = async ({
  projectId,
  recordId,
}: ReadWorkspaceManifestParams) => {
  const manifestPath = getWorkspaceManifestPath({ projectId, recordId })

  if (!(await pathExists(manifestPath))) {
    return null
  }

  return readJsonFile({
    filePath: manifestPath,
    schema: workspaceManifestSchema,
  })
}
