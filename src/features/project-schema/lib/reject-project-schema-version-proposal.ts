import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { withDrizzlePg } from "machin/drizzle/pg"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectSchemaVersionMachineDefinition } from "@/features/project-schema/lib/project-schema-version-machine"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "insert" | "select" | "update">

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

  const projectSchemaVersionMachine = withDrizzlePg(
    projectSchemaVersionMachineDefinition,
    {
      db: database,
      table: projectSchemaVersionTable,
    },
  )
  const actor = await projectSchemaVersionMachine.getActor(schemaVersionId)

  if (!actor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Schema proposal actor was not found.",
    })
  }

  const rejectedActor = await actor.send("reject", actor.context)

  if (rejectedActor.state !== "rejected") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Schema proposal could not be rejected from its current state.",
    })
  }

  await createActivityLogEvent({
    actorId: rejectedByUserId,
    actorType: "user",
    agentRunId: null,
    database,
    entityId: proposal.id,
    entityType: "projectSchemaVersion",
    eventType: "schema.version_rejected",
    organizationId,
    payload: {
      version: proposal.version,
    },
    projectId,
    recordId: null,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: null,
    taskRecordId: null,
  })

  return {
    id: proposal.id,
    state: rejectedActor.state,
    version: proposal.version,
  }
}
