import { eq } from "drizzle-orm"
import { createProjectSchemaVersionActor } from "@/features/project-schema/lib/project-schema-version-machine"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "select">

type CreateProjectSchemaVersionProposalParams = {
  database: DatabaseClient
  id: string
  parentVersionId: string | null
  projectId: string
  proposedBy: string | null
  schemaDefinition: ProjectSchemaDefinition
  version: number
}

export const createProjectSchemaVersionProposal = async ({
  database,
  id,
  parentVersionId,
  projectId,
  proposedBy,
  schemaDefinition,
  version,
}: CreateProjectSchemaVersionProposalParams) => {
  await createProjectSchemaVersionActor(id, {
    parentVersionId,
    projectId,
    proposedBy,
    schemaDefinition,
    version,
  })

  return database
    .select({
      createdAt: projectSchemaVersionTable.createdAt,
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      projectId: projectSchemaVersionTable.projectId,
      proposedBy: projectSchemaVersionTable.proposedBy,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      state: projectSchemaVersionTable.state,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(eq(projectSchemaVersionTable.id, id))
    .then((rows) => rows[0] ?? null)
}
