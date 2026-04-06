import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { getProjectSchemaVersionActor } from "@/features/project-schema/lib/project-schema-version-machine"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "select">

type AcceptProjectSchemaVersionProposalParams = {
  acceptedByUserId: string
  database: DatabaseClient
  organizationId: string
  projectId: string
  schemaVersionId: string
}

export const acceptProjectSchemaVersionProposal = async ({
  acceptedByUserId,
  database,
  organizationId,
  projectId,
  schemaVersionId,
}: AcceptProjectSchemaVersionProposalParams) => {
  const proposal = await database
    .select({
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      projectId: projectSchemaVersionTable.projectId,
      proposedBy: projectSchemaVersionTable.proposedBy,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      state: projectSchemaVersionTable.state,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(
      and(
        eq(projectSchemaVersionTable.id, schemaVersionId),
        eq(projectSchemaVersionTable.projectId, projectId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!proposal) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Schema proposal was not found.",
    })
  }

  if (proposal.state !== "created") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only schema proposals in created state can be accepted.",
    })
  }

  const previousVersion = proposal.parentVersionId
    ? await database
        .select({
          id: projectSchemaVersionTable.id,
          schemaDefinition: projectSchemaVersionTable.schemaDefinition,
          version: projectSchemaVersionTable.version,
        })
        .from(projectSchemaVersionTable)
        .where(eq(projectSchemaVersionTable.id, proposal.parentVersionId))
        .then((rows) => rows[0] ?? null)
    : null

  const actor = await getProjectSchemaVersionActor(schemaVersionId)

  const acceptedActor = await actor.send("accept", {
    acceptedByUserId,
    organizationId,
    previousSchemaDefinition: previousVersion?.schemaDefinition ?? null,
    previousVersionId: previousVersion?.id ?? null,
    previousVersionNumber: previousVersion?.version ?? null,
    schemaVersionId,
  })

  if (acceptedActor.state !== "accepted") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Schema proposal could not be accepted from its current state.",
    })
  }

  return {
    ...proposal,
    state: acceptedActor.state,
  }
}
