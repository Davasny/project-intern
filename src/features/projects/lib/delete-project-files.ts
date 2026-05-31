import { rm } from "node:fs/promises"
import {
  getProjectSkillsDirectory,
  getProjectWorkspaceDirectory,
} from "@/lib/config/backend"
import { logger } from "@/lib/logger"

type DeleteProjectFilesParams = {
  organizationId: string
  projectId: string
}

const removeDirectory = async (directoryPath: string) => {
  try {
    await rm(directoryPath, { force: true, recursive: true })
  } catch (error) {
    logger.error({ directoryPath, error }, "Failed to delete project directory")
  }
}

export const deleteProjectFiles = async ({
  organizationId,
  projectId,
}: DeleteProjectFilesParams) => {
  await removeDirectory(getProjectWorkspaceDirectory(projectId))
  await removeDirectory(getProjectSkillsDirectory(organizationId, projectId))
}
