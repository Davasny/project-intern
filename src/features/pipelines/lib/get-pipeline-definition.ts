import { and, eq } from "drizzle-orm"
import { pipelineDefinitionTable } from "@/features/pipelines/db"
import { ensureDefaultPipelineDefinitions } from "@/features/pipelines/lib/ensure-default-pipeline-definitions"
import { pipelineDefinitionSchema } from "@/features/pipelines/schemas/pipeline-definition"
import { db } from "@/lib/db"

type GetPipelineDefinitionParams = {
  projectId: string
  version: string | null
}

export const getPipelineDefinition = async ({
  projectId,
  version,
}: GetPipelineDefinitionParams) =>
  version === null
    ? null
    : db
        .select()
        .from(pipelineDefinitionTable)
        .where(
          and(
            eq(pipelineDefinitionTable.projectId, projectId),
            eq(pipelineDefinitionTable.version, version),
          ),
        )
        .then(async (rows) => {
          const pipelineDefinition = rows[0] ?? null

          if (pipelineDefinition) {
            return pipelineDefinitionSchema.parse(pipelineDefinition)
          }

          await ensureDefaultPipelineDefinitions({ projectId })

          return db
            .select()
            .from(pipelineDefinitionTable)
            .where(
              and(
                eq(pipelineDefinitionTable.projectId, projectId),
                eq(pipelineDefinitionTable.version, version),
              ),
            )
            .then((nextRows) =>
              nextRows[0] ? pipelineDefinitionSchema.parse(nextRows[0]) : null,
            )
        })
