import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { createProjectSchemaVersionProposal } from "@/features/project-schema/lib/create-project-schema-version-proposal"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { validateProjectSchemaDefinitionFromFullDefinition } from "@/features/project-schema/lib/validate-project-schema-definition-from-full-definition"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type CreateProjectSchemaVersionProposalByProjectIdParams = {
  actorId: string
  projectId: string
  schemaDefinitionInput: unknown
}

export const createProjectSchemaVersionProposalByProjectId = async ({
  actorId,
  projectId,
  schemaDefinitionInput,
}: CreateProjectSchemaVersionProposalByProjectIdParams) => {
  const schemaDefinition = validateProjectSchemaDefinitionFromFullDefinition(
    schemaDefinitionInput,
  )

  const project = await db
    .select({
      activeSchemaVersionId: projectTable.activeSchemaVersionId,
      id: projectTable.id,
      organizationId: projectTable.organizationId,
    })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project was not found.",
    })
  }

  return db.transaction(async (transaction) => {
    const latestSchemaVersion = await transaction
      .select({
        version: projectSchemaVersionTable.version,
      })
      .from(projectSchemaVersionTable)
      .where(eq(projectSchemaVersionTable.projectId, project.id))
      .orderBy(desc(projectSchemaVersionTable.version))
      .then((rows) => rows[0] ?? null)

    const generatedIds = await generateUuidV7Values({
      count: 1,
      database: transaction,
    })
    const schemaVersionId = generatedIds[0]

    if (!schemaVersionId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Schema proposal id could not be generated.",
      })
    }

    const proposal = await createProjectSchemaVersionProposal({
      database: transaction,
      id: schemaVersionId,
      parentVersionId: project.activeSchemaVersionId,
      projectId: project.id,
      proposedBy: actorId,
      schemaDefinition,
      version: (latestSchemaVersion?.version ?? 0) + 1,
    })

    if (!proposal) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Schema proposal could not be created.",
      })
    }

    return proposal
  })
}
