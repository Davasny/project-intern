import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { db } from "@/lib/db"

type GetProjectSchemaVersionByProjectIdParams = {
  projectId: string
  version: number
}

export const getProjectSchemaVersionByProjectId = async ({
  projectId,
  version,
}: GetProjectSchemaVersionByProjectIdParams) => {
  const schemaVersion = await db
    .select({
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      projectId: projectSchemaVersionTable.projectId,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(
      and(
        eq(projectSchemaVersionTable.projectId, projectId),
        eq(projectSchemaVersionTable.version, version),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!schemaVersion) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Schema version v${version} was not found.`,
    })
  }

  return schemaVersion
}
