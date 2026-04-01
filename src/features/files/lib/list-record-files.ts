import { getRecordFilesManifestPath } from "@/features/files/lib/get-record-files-manifest-path"
import { recordFileManifestSchema } from "@/features/files/schemas/record-file-entry"
import { pathExists } from "@/utils/path-exists"
import { readJsonFile } from "@/utils/read-json-file"

type ListRecordFilesParams = {
  projectId: string
  recordId: string
}

export const listRecordFiles = async ({
  projectId,
  recordId,
}: ListRecordFilesParams) => {
  const manifestPath = getRecordFilesManifestPath({ projectId, recordId })

  if (!(await pathExists(manifestPath))) {
    return []
  }

  const manifest = await readJsonFile({
    filePath: manifestPath,
    schema: recordFileManifestSchema,
  })

  return manifest.files
}
