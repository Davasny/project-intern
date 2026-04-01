import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getParserAssetBundle } from "@/features/pipelines/lib/get-parser-asset-bundle"

type EnsurePipelineAssetsInWorkspaceParams = {
  parserAssetVersion: string
  projectId: string
  recordId: string
}

export const ensurePipelineAssetsInWorkspace = async ({
  parserAssetVersion,
  projectId,
  recordId,
}: EnsurePipelineAssetsInWorkspaceParams) => {
  const workspace = await ensureRecordWorkspace({ projectId, recordId })
  const bundle = getParserAssetBundle(parserAssetVersion)
  const bundleDirectory = path.join(
    workspace.pipelineAssetsDirectory,
    parserAssetVersion,
  )

  await mkdir(bundleDirectory, { recursive: true })

  await Promise.all(
    bundle.files.map(async (file) => {
      const targetPath = path.join(bundleDirectory, file.relativePath)

      await mkdir(path.dirname(targetPath), { recursive: true })
      await writeFile(targetPath, file.content)
    }),
  )

  return {
    bundleDirectory,
    version: bundle.version,
  }
}
