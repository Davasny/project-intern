import path from "node:path"
import { getRecordWorkspaceDirectory } from "@/features/execution/lib/get-record-workspace-directory"
import { ensureDirectory } from "@/utils/ensure-directory"

type EnsureRecordWorkspaceParams = {
  projectId: string
  recordId: string
}

export const ensureRecordWorkspace = async ({
  projectId,
  recordId,
}: EnsureRecordWorkspaceParams) => {
  const workspaceDirectory = getRecordWorkspaceDirectory({
    projectId,
    recordId,
  })

  await Promise.all([
    ensureDirectory(workspaceDirectory),
    ensureDirectory(path.join(workspaceDirectory, "data")),
    ensureDirectory(path.join(workspaceDirectory, "artifacts")),
    ensureDirectory(path.join(workspaceDirectory, "logs")),
    ensureDirectory(path.join(workspaceDirectory, "scratch")),
    ensureDirectory(path.join(workspaceDirectory, ".opencode", "skills")),
  ])

  return {
    artifactsDirectory: path.join(workspaceDirectory, "artifacts"),
    dataDirectory: path.join(workspaceDirectory, "data"),
    logsDirectory: path.join(workspaceDirectory, "logs"),
    scratchDirectory: path.join(workspaceDirectory, "scratch"),
    workspaceDirectory,
    opencodeSkillsDirectory: path.join(
      workspaceDirectory,
      ".opencode",
      "skills",
    ),
  }
}
