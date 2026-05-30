import { TRPCError } from "@trpc/server"
import { acceptProjectSchemaVersionProposal } from "@/features/project-schema/lib/accept-project-schema-version-proposal"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type AcceptProjectSchemaVersionProposalByIdParams = {
  organizationSlug: string
  projectSlug: string
  schemaVersionId: string
  userId: string
}

export const acceptProjectSchemaVersionProposalById = async ({
  organizationSlug,
  projectSlug,
  schemaVersionId,
  userId,
}: AcceptProjectSchemaVersionProposalByIdParams) => {
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
    acceptProjectSchemaVersionProposal({
      acceptedByUserId: userId,
      database: transaction,
      projectId: project.id,
      schemaVersionId,
    }),
  )
}
