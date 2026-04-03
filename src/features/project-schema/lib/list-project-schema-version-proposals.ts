import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type ListProjectSchemaVersionProposalsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listProjectSchemaVersionProposals = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListProjectSchemaVersionProposalsParams) => {
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

  return db
    .select({
      createdAt: projectSchemaVersionTable.createdAt,
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      proposedBy: projectSchemaVersionTable.proposedBy,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      state: projectSchemaVersionTable.state,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(
      and(
        eq(projectSchemaVersionTable.projectId, project.id),
        eq(projectSchemaVersionTable.state, "created"),
      ),
    )
    .orderBy(desc(projectSchemaVersionTable.version))
}
