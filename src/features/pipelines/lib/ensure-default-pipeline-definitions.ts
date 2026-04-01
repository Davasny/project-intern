import { count, eq } from "drizzle-orm"
import { pipelineDefinitionTable } from "@/features/pipelines/db"
import { getDefaultPipelineDefinitions } from "@/features/pipelines/lib/get-default-pipeline-definitions"
import { db } from "@/lib/db"

type EnsureDefaultPipelineDefinitionsParams = {
  projectId: string
}

export const ensureDefaultPipelineDefinitions = async ({
  projectId,
}: EnsureDefaultPipelineDefinitionsParams) => {
  const existingDefinitionCount = await db
    .select({ count: count() })
    .from(pipelineDefinitionTable)
    .where(eq(pipelineDefinitionTable.projectId, projectId))
    .then((rows) => rows[0]?.count ?? 0)

  if (existingDefinitionCount > 0) {
    return
  }

  await db.insert(pipelineDefinitionTable).values(
    getDefaultPipelineDefinitions(projectId).map((definition) => ({
      createdAt: definition.createdAt,
      id: definition.id,
      name: definition.name,
      parserAssetVersion: definition.parserAssetVersion,
      projectId: definition.projectId,
      stages: definition.stages,
      version: definition.version,
    })),
  )
}
