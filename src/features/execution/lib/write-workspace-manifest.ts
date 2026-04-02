import path from "node:path"
import { listArtifacts } from "@/features/artifacts/lib/list-artifacts"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getWorkspaceManifestPath } from "@/features/execution/lib/get-workspace-manifest-path"
import { workspaceManifestSchema } from "@/features/execution/schemas/workspace-manifest"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { writeJsonFile } from "@/utils/write-json-file"

type WriteWorkspaceManifestParams = {
  artifactIds: string[]
  fileIds: string[]
  projectId: string
  recordId: string
  taskId: string | null
}

export const writeWorkspaceManifest = async ({
  artifactIds,
  fileIds,
  projectId,
  recordId,
  taskId,
}: WriteWorkspaceManifestParams) => {
  const workspace = await ensureRecordWorkspace({ projectId, recordId })
  const [artifacts, files] = await Promise.all([
    listArtifacts({ projectId, recordId }),
    listRecordFiles({ projectId, recordId }),
  ])

  const manifest = workspaceManifestSchema.parse({
    artifacts: artifacts
      .filter((artifact) => artifactIds.includes(artifact.id))
      .map((artifact) => ({
        artifactId: artifact.id,
        sourceHash: artifact.sourceHash,
        stage: artifact.stage,
        workspacePath: path.join(
          workspace.artifactsDirectory,
          artifact.fileName,
        ),
      })),
    files: files
      .filter((file) => fileIds.includes(file.id))
      .map((file) => ({
        fileId: file.id,
        originalFileName: file.originalFileName,
        sha256: file.sha256,
        workspacePath: path.join(
          workspace.sourceFilesDirectory,
          file.originalFileName,
        ),
      })),
    projectId,
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
