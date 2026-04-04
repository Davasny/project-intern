import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectSchemaVersionMachine } from "@/features/project-schema/lib/project-schema-version-machine"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { projectTable } from "@/features/projects/db"
import type { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type DatabaseClient = Pick<
  typeof db,
  "execute" | "insert" | "select" | "update"
>

type CreateProjectSchemaVersionProposalParams = {
  database: DatabaseClient
  projectId: string
  proposedBy: string | null
  schemaDefinition: ProjectSchemaDefinition
}

export const createProjectSchemaVersionProposal = async ({
  database,
  projectId,
  proposedBy,
  schemaDefinition,
}: CreateProjectSchemaVersionProposalParams) => {
  const project = await database
    .select({ activeSchemaVersionId: projectTable.activeSchemaVersionId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  const latestSchemaVersion = await database
    .select({
      id: projectSchemaVersionTable.id,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(eq(projectSchemaVersionTable.projectId, projectId))
    .orderBy(desc(projectSchemaVersionTable.version))
    .then((rows) => rows[0] ?? null)

  const generatedIds = await generateUuidV7Values({
    count: 1,
    database,
  })
  const schemaVersionId = generatedIds[0]

  if (!schemaVersionId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Schema proposal id could not be generated.",
    })
  }

  await projectSchemaVersionMachine.createActor(schemaVersionId, {
    parentVersionId: project?.activeSchemaVersionId ?? null,
    projectId,
    proposedBy,
    schemaDefinition,
    version: (latestSchemaVersion?.version ?? 0) + 1,
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
    .where(eq(projectSchemaVersionTable.id, schemaVersionId))
    .then((rows) => rows[0] ?? null)
}
