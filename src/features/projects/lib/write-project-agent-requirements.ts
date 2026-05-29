import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getProjectRequirementsPath } from "@/lib/config/backend"
import { ensureDirectory } from "@/utils/ensure-directory"

type WriteProjectAgentRequirementsParams = {
  projectId: string
  requirements: string
}

export const writeProjectAgentRequirements = async ({
  projectId,
  requirements,
}: WriteProjectAgentRequirementsParams) => {
  const requirementsPath = getProjectRequirementsPath(projectId)

  await ensureDirectory(path.dirname(requirementsPath))
  await writeFile(requirementsPath, requirements)

  return { requirementsPath }
}
