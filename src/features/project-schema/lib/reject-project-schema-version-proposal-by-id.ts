import { TRPCError } from "@trpc/server"
import { rejectProjectSchemaVersionProposal } from "@/features/project-schema/lib/reject-project-schema-version-proposal"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type RejectProjectSchemaVersionProposalByIdParams = {
  organizationSlug: string
  projectSlug: string
  schemaVersionId: string
  userId: string
}

export const rejectProjectSchemaVersionProposalById = async ({
  organizationSlug,
  projectSlug,
  schemaVersionId,
  userId,
}: RejectProjectSchemaVersionProposalByIdParams) => {
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

  return db.transaction((transaction) =>
    rejectProjectSchemaVersionProposal({
      database: transaction,
      projectId: project.id,
      rejectedByUserId: userId,
      schemaVersionId,
    }),
  )
}
