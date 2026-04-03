import { rm } from "node:fs/promises"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { copyDirectoryEntries } from "@/lib/storage/copy-directory-entries"
import { getRecordDataDirectory } from "@/lib/storage/get-record-data-directory"
import { ensureDirectory } from "@/utils/ensure-directory"

type MirrorRecordWorkspaceDataToStorageParams = {
  organizationId: string
  projectId: string
  recordId: string
}

export const mirrorRecordWorkspaceDataToStorage = async ({
  organizationId,
  projectId,
  recordId,
}: MirrorRecordWorkspaceDataToStorageParams) => {
  const workspace = await ensureRecordWorkspace({ projectId, recordId })
  const storageDirectory = getRecordDataDirectory({
    organizationId,
    projectId,
    recordId,
  })

  await rm(storageDirectory, { force: true, recursive: true })
  await ensureDirectory(storageDirectory)

  const mirroredEntries = await copyDirectoryEntries({
    sourceDirectory: workspace.dataDirectory,
    targetDirectory: storageDirectory,
  })

  return {
    dataDirectory: workspace.dataDirectory,
    mirroredEntryCount: mirroredEntries.entryCount,
    storageDirectory,
  }
}
