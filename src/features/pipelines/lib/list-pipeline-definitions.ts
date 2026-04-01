import { asc, eq } from "drizzle-orm"
import { pipelineDefinitionTable } from "@/features/pipelines/db"
import { ensureDefaultPipelineDefinitions } from "@/features/pipelines/lib/ensure-default-pipeline-definitions"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type ListPipelineDefinitionsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listPipelineDefinitions = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListPipelineDefinitionsParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    return []
  }

  await ensureDefaultPipelineDefinitions({ projectId: project.id })

  return db
    .select()
    .from(pipelineDefinitionTable)
    .where(eq(pipelineDefinitionTable.projectId, project.id))
    .orderBy(asc(pipelineDefinitionTable.createdAt))
}
