import { getPipelineRunManifestPath } from "@/features/pipelines/lib/get-pipeline-run-manifest-path"
import {
  pipelineRunEntrySchema,
  pipelineRunManifestSchema,
} from "@/features/pipelines/schemas/pipeline-run-entry"
import { ensureDirectory } from "@/utils/ensure-directory"
import { pathExists } from "@/utils/path-exists"
import { readJsonFile } from "@/utils/read-json-file"
import { writeJsonFile } from "@/utils/write-json-file"

type RegisterPipelineRunParams = {
  agentRunId: string
  metadata: Record<string, unknown>
  projectId: string
  recordId: string
  stage: string
  status: "completed" | "failed" | "running"
  taskId: string
  taskRecordId: string
}

export const registerPipelineRun = async ({
  agentRunId,
  metadata,
  projectId,
  recordId,
  stage,
  status,
  taskId,
  taskRecordId,
}: RegisterPipelineRunParams) => {
  const manifestPath = getPipelineRunManifestPath({ projectId, recordId })
  await ensureDirectory(manifestPath.replace("/pipeline-runs.json", ""))

  const existingManifest = (await pathExists(manifestPath))
    ? await readJsonFile({
        filePath: manifestPath,
        schema: pipelineRunManifestSchema,
      })
    : { runs: [] }

  const entry = pipelineRunEntrySchema.parse({
    agentRunId,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    metadata,
    projectId,
    recordId,
    stage,
    status,
    taskId,
    taskRecordId,
  })

  const manifest = pipelineRunManifestSchema.parse({
    runs: [...existingManifest.runs, entry],
  })

  await writeJsonFile({
    filePath: manifestPath,
    value: manifest,
  })

  return entry
}
