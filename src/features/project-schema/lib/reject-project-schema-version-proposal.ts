import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { getProjectSchemaVersionActor } from "@/features/project-schema/lib/project-schema-version-machine"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "select">

type RejectProjectSchemaVersionProposalParams = {
  database: DatabaseClient
  organizationId: string
  projectId: string
  rejectedByUserId: string
  schemaVersionId: string
}

export const rejectProjectSchemaVersionProposal = async ({
  database,
  organizationId,
  projectId,
  rejectedByUserId,
  schemaVersionId,
}: RejectProjectSchemaVersionProposalParams) => {
  const proposal = await database
    .select({
      id: projectSchemaVersionTable.id,
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
      message: "Only schema proposals in created state can be rejected.",
    })
  }

  const actor = await getProjectSchemaVersionActor(schemaVersionId)

  const rejectedActor = await actor.send("reject", {
    organizationId,
    rejectedByUserId,
    schemaVersionId,
  })

  if (rejectedActor.state !== "rejected") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Schema proposal could not be rejected from its current state.",
    })
  }

  return {
    id: proposal.id,
    state: rejectedActor.state,
    version: proposal.version,
  }
}
