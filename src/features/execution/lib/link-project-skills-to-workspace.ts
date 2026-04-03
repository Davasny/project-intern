import fs from "node:fs/promises"
import path from "node:path"
import { logger } from "@/lib/logger"

type LinkProjectSkillsToWorkspaceParams = {
  opencodeSkillsDirectory: string
  projectSkillsDirectory: string
}

export const linkProjectSkillsToWorkspace = async ({
  opencodeSkillsDirectory,
  projectSkillsDirectory,
}: LinkProjectSkillsToWorkspaceParams) => {
  let linkedCount = 0

  try {
    const entries = await fs.readdir(projectSkillsDirectory, {
      withFileTypes: true,
    })

    const skillDirs = entries.filter(
      (entry) => entry.isDirectory() && entry.name !== "node_modules",
    )

    const linkPromises = skillDirs.map(async (skillDir) => {
      const skillPath = path.join(projectSkillsDirectory, skillDir.name)
      const hasSkillMd = await fs
        .stat(path.join(skillPath, "SKILL.md"))
        .then(() => true)
        .catch(() => false)

      if (!hasSkillMd) return

      const linkPath = path.join(opencodeSkillsDirectory, skillDir.name)

      try {
        const existing = await fs.lstat(linkPath)

        if (existing.isSymbolicLink()) {
          const target = await fs.readlink(linkPath)

          if (target === skillPath) return

          await fs.unlink(linkPath)
        } else {
          await fs.rm(linkPath, { force: true, recursive: true })
        }
      } catch {
        // link does not exist
      }

      await fs.symlink(skillPath, linkPath, "dir")
      linkedCount++
    })

    await Promise.all(linkPromises)

    logger.info(
      {
        linkedCount,
        opencodeSkillsDirectory,
        projectSkillsDirectory,
        totalCandidates: skillDirs.length,
      },
      "Linked project skills to workspace",
    )
  } catch (error) {
    logger.warn(
      {
        error,
        opencodeSkillsDirectory,
        projectSkillsDirectory,
      },
      "Failed to link project skills to workspace",
    )
  }

  return { linkedCount }
}
