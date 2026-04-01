import { eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { db } from "@/lib/db"

type ListProjectSchemaVersionsByProjectIdParams = {
  projectId: string
}

export const listProjectSchemaVersionsByProjectId = async ({
  projectId,
}: ListProjectSchemaVersionsByProjectIdParams) => {
  const activeProjectSchemaVersion =
    await getActiveProjectSchemaVersionByProjectId({
      projectId,
    })

  const versions = await db
    .select({
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      projectId: projectSchemaVersionTable.projectId,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(eq(projectSchemaVersionTable.projectId, projectId))

  return versions.map((version) => ({
    ...version,
    isActive: version.id === activeProjectSchemaVersion.id,
  }))
}
