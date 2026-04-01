import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getWorkspaceManifestPath } from "@/features/execution/lib/get-workspace-manifest-path"
import { workspaceManifestSchema } from "@/features/execution/schemas/workspace-manifest"
import { writeJsonFile } from "@/utils/write-json-file"

type WriteWorkspaceManifestParams = {
  artifactIds: string[]
  fileIds: string[]
  pipelineVersion: string | null
  projectId: string
  recordId: string
  taskId: string
}

export const writeWorkspaceManifest = async ({
  artifactIds,
  fileIds,
  pipelineVersion,
  projectId,
  recordId,
  taskId,
}: WriteWorkspaceManifestParams) => {
  await ensureRecordWorkspace({ projectId, recordId })

  const manifest = workspaceManifestSchema.parse({
    artifactIds,
    fileIds,
    pipelineVersion,
    recordId,
    taskId,
    updatedAt: new Date().toISOString(),
  })

  await writeJsonFile({
    filePath: getWorkspaceManifestPath({ projectId, recordId }),
    value: manifest,
  })

  return manifest
}
