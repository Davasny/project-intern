import { copyFile } from "node:fs/promises"
import path from "node:path"
import { getArtifactById } from "@/features/artifacts/lib/get-artifact-by-id"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"

type GetArtifactParams = {
  artifactId: string
  projectId: string
  recordId: string
}

export const getArtifact = async ({
  artifactId,
  projectId,
  recordId,
}: GetArtifactParams) => {
  const artifact = await getArtifactById({ artifactId, projectId, recordId })
  const workspace = await ensureRecordWorkspace({ projectId, recordId })
  const hydratedPath = path.join(
    workspace.artifactsDirectory,
    artifact.fileName,
  )

  await copyFile(artifact.storagePath, hydratedPath)

  return {
    artifact,
    hydratedPath,
  }
}
