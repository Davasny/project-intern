import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type ListProjectSchemaVersionsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listProjectSchemaVersions = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListProjectSchemaVersionsParams) => {
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
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(eq(projectSchemaVersionTable.projectId, project.id))
    .orderBy(desc(projectSchemaVersionTable.version))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        isActive: row.id === project.activeSchemaVersionId,
      })),
    )
}
