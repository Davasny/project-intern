import { rm } from "node:fs/promises"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { copyDirectoryEntries } from "@/lib/storage/copy-directory-entries"
import { getRecordDataDirectory } from "@/lib/storage/get-record-data-directory"
import { ensureDirectory } from "@/utils/ensure-directory"

type PrepareRecordWorkspaceDataParams = {
  organizationId: string
  projectId: string
  recordId: string
}

export const prepareRecordWorkspaceData = async ({
  organizationId,
  projectId,
  recordId,
}: PrepareRecordWorkspaceDataParams) => {
  const workspace = await ensureRecordWorkspace({ projectId, recordId })
  const storageDirectory = getRecordDataDirectory({
    organizationId,
    projectId,
    recordId,
  })

  await ensureDirectory(storageDirectory)
  await rm(workspace.dataDirectory, { force: true, recursive: true })
  await ensureDirectory(workspace.dataDirectory)

  const copiedEntries = await copyDirectoryEntries({
    sourceDirectory: storageDirectory,
    targetDirectory: workspace.dataDirectory,
  })

  return {
    copiedEntryCount: copiedEntries.entryCount,
    dataDirectory: workspace.dataDirectory,
    storageDirectory,
  }
}
