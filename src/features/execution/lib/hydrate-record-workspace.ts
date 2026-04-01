import { getArtifact } from "@/features/artifacts/lib/get-artifact"
import { listArtifacts } from "@/features/artifacts/lib/list-artifacts"
import { fetchRecordFile } from "@/features/files/lib/fetch-record-file"
import { listRecordFiles } from "@/features/files/lib/list-record-files"

type HydrateRecordWorkspaceParams = {
  projectId: string
  recordId: string
}

export const hydrateRecordWorkspace = async ({
  projectId,
  recordId,
}: HydrateRecordWorkspaceParams) => {
  const [artifacts, files] = await Promise.all([
    listArtifacts({ projectId, recordId }),
    listRecordFiles({ projectId, recordId }),
  ])

  await Promise.all([
    ...files.map((file) =>
      fetchRecordFile({
        fileId: file.id,
        projectId,
        recordId,
      }),
    ),
    ...artifacts.map((artifact) =>
      getArtifact({
        artifactId: artifact.id,
        projectId,
        recordId,
      }),
    ),
  ])

  return {
    artifactCount: artifacts.length,
    fileCount: files.length,
  }
}
