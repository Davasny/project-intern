import { copyFile } from "node:fs/promises"
import path from "node:path"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getRecordFileById } from "@/features/files/lib/get-record-file-by-id"

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
  const hydratedPath = path.join(workspace.sourceFilesDirectory, file.fileName)

  await copyFile(file.storagePath, hydratedPath)

  return {
    file,
    hydratedPath,
  }
}
