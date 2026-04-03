import { TRPCError } from "@trpc/server"
import { createProjectSchemaVersionProposal } from "@/features/project-schema/lib/create-project-schema-version-proposal"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type CreateProjectSchemaVersionDraftParams = {
  customFields: unknown[]
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createProjectSchemaVersionDraft = async ({
  customFields,
  organizationSlug,
  projectSlug,
  userId,
}: CreateProjectSchemaVersionDraftParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const schemaDefinition = validateProjectSchemaDefinition(customFields)

  return db.transaction(async (transaction) => {
    const proposal = await createProjectSchemaVersionProposal({
      database: transaction,
      projectId: project.id,
      proposedBy: userId,
      schemaDefinition,
    })

    if (!proposal) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Schema draft could not be created.",
      })
    }

    return proposal
  })
}
