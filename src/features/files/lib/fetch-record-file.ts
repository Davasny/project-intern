import { copyFile } from "node:fs/promises"
import path from "node:path"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getRecordFileById } from "@/features/files/lib/get-record-file-by-id"
import { resolveSourceFileStoragePath } from "@/features/files/lib/resolve-source-file-storage-path"

type FetchRecordFileParams = {
  fileId: string
  projectId: string
  recordId: string
}

export const fetchRecordFile = async ({
  fileId,
  projectId,
  recordId,
}: FetchRecordFileParams) => {
  const file = await getRecordFileById({ fileId, projectId, recordId })
  const workspace = await ensureRecordWorkspace({ projectId, recordId })
  const hydratedPath = path.join(
    workspace.sourceFilesDirectory,
    file.originalFileName,
  )

  await copyFile(
    resolveSourceFileStoragePath({ storagePath: file.storagePath }),
    hydratedPath,
  )

  return {
    file,
    hydratedPath,
  }
}
