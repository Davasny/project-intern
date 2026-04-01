import { pipelineDefinitionSchema } from "@/features/pipelines/schemas/pipeline-definition"

type GetPipelineDefinitionParams = {
  projectId: string
  taskId: string
  version: string | null
}

export const getPipelineDefinition = ({
  projectId,
  taskId,
  version,
}: GetPipelineDefinitionParams) =>
  pipelineDefinitionSchema.parse({
    invalidationPolicy: "replace_on_version_change",
    projectId,
    stages: version === null ? [] : ["ingest", "transform", "publish"],
    taskId,
    version,
  })
