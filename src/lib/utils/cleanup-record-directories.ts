import { rm } from "node:fs/promises"
import { logger } from "@/lib/logger"

type CleanupRecordDirectoriesParams = {
  organizationId: string
  projectId: string
  recordId: string
}

export const cleanupRecordDirectories = async ({
  organizationId,
  projectId,
  recordId,
}: CleanupRecordDirectoriesParams) => {
  const { getRecordDataDirectory } = await import(
    "@/lib/storage/get-record-data-directory"
  )
  const { getRecordWorkspaceDirectory } = await import(
    "@/features/execution/lib/get-record-workspace-directory"
  )

  const directories = [
    getRecordDataDirectory({ organizationId, projectId, recordId }),
    getRecordWorkspaceDirectory({ projectId, recordId }),
  ]

  await Promise.allSettled(
    directories.map(async (directory) => {
      try {
        await rm(directory, { force: true, recursive: true })
      } catch (error) {
        logger.warn({ directory, error }, "Failed to cleanup record directory")
      }
    }),
  )
}
