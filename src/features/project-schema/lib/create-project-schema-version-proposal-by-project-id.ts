import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { createProjectSchemaVersionProposal } from "@/features/project-schema/lib/create-project-schema-version-proposal"
import { validateProjectSchemaDefinitionFromFullDefinition } from "@/features/project-schema/lib/validate-project-schema-definition-from-full-definition"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

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
    const proposal = await createProjectSchemaVersionProposal({
      database: transaction,
      projectId: project.id,
      proposedBy: actorId,
      schemaDefinition,
    })

    if (!proposal) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Schema proposal could not be created.",
      })
    }

    await createActivityLogEvent({
      actorId,
      actorType: "system",
      agentRunId: null,
      database: transaction,
      entityId: proposal.id,
      entityType: "projectSchemaVersion",
      eventType: "schema.version_proposed",
      organizationId: project.organizationId,
      payload: {
        version: proposal.version,
      },
      projectId: project.id,
      recordId: null,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: null,
      taskRecordId: null,
    })

    return proposal
  })
}
