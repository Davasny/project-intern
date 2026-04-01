import { getArtifactManifestPath } from "@/features/artifacts/lib/get-artifact-manifest-path"
import { artifactManifestSchema } from "@/features/artifacts/schemas/artifact-entry"
import { pathExists } from "@/utils/path-exists"
import { readJsonFile } from "@/utils/read-json-file"

type ListArtifactsParams = {
  projectId: string
  recordId: string
}

export const listArtifacts = async ({
  projectId,
  recordId,
}: ListArtifactsParams) => {
  const manifestPath = getArtifactManifestPath({ projectId, recordId })

  if (!(await pathExists(manifestPath))) {
    return []
  }

  const manifest = await readJsonFile({
    filePath: manifestPath,
    schema: artifactManifestSchema,
  })

  return manifest.artifacts
}
