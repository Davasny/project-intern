import path from "node:path"
import { getProjectSkillsDirectory } from "@/lib/config/backend"
import { ensureDirectory } from "@/utils/ensure-directory"

type EnsureProjectSkillsOnDiskParams = {
  organizationId: string
  projectId: string
}

export const ensureProjectSkillsOnDisk = async ({
  organizationId,
  projectId,
}: EnsureProjectSkillsOnDiskParams) => {
  const skillsDirectory = getProjectSkillsDirectory(organizationId, projectId)

  await ensureDirectory(skillsDirectory)

  return {
    skillsDirectory,
    opencodeSkillsPaths: [skillsDirectory],
    recordWorkspaceOpencodeDir: (recordWorkspaceDir: string) =>
      path.join(recordWorkspaceDir, ".opencode"),
  }
}
