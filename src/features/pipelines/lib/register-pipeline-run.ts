import { pipelineRunTable } from "@/features/pipelines/db"
import { getPipelineDefinition } from "@/features/pipelines/lib/get-pipeline-definition"
import { pipelineRunEntrySchema } from "@/features/pipelines/schemas/pipeline-run-entry"
import { db } from "@/lib/db"

type RegisterPipelineRunParams = {
  agentRunId: string | null
  metadata: Record<string, unknown>
  pipelineVersion: string
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
  pipelineVersion,
  projectId,
  recordId,
  stage,
  status,
  taskId,
  taskRecordId,
}: RegisterPipelineRunParams) => {
  const pipelineDefinition = await getPipelineDefinition({
    projectId,
    version: pipelineVersion,
  })

  const [pipelineRun] = await db
    .insert(pipelineRunTable)
    .values({
      agentRunId,
      metadata,
      pipelineDefinitionId: pipelineDefinition?.id ?? null,
      pipelineVersion,
      projectId,
      recordId,
      stage,
      state: status,
      taskId,
      taskRecordId,
    })
    .returning()

  return pipelineRunEntrySchema.parse(pipelineRun)
}
