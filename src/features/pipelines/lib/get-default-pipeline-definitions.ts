import type { PipelineDefinition } from "@/features/pipelines/schemas/pipeline-definition"

const now = new Date("2026-04-02T00:00:00.000Z")

export const getDefaultPipelineDefinitions = (
  projectId: string,
): PipelineDefinition[] => [
  {
    createdAt: now,
    id: crypto.randomUUID(),
    name: "Record file processing",
    parserAssetVersion: "crm-parser-assets-v1",
    projectId,
    stages: [
      "text_extraction",
      "structure_normalization",
      "field_candidates",
      "record_patch_input",
      "post_validation_report",
    ],
    version: "record-file-pipeline-v1",
  },
]
