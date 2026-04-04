import { TRPCError } from "@trpc/server"
import { and, eq, sql } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { buildSchemaMigrationTaskDescription } from "@/features/project-schema/lib/build-schema-migration-task-description"
import { projectSchemaVersionMachine } from "@/features/project-schema/lib/project-schema-version-machine"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { createProjectTask } from "@/features/tasks/lib/create-project-task"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<
  typeof db,
  "execute" | "insert" | "select" | "update"
>

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

  await database
    .update(projectTable)
    .set({ activeSchemaVersionId: proposal.id })
    .where(eq(projectTable.id, projectId))

  const [{ recordCount }] = await database
    .select({ recordCount: sql<number>`count(*)::int` })
    .from(recordTable)
    .where(eq(recordTable.projectId, projectId))

  const migrationTask =
    previousVersion && recordCount > 0
      ? await createProjectTask({
          createdByUserId: acceptedByUserId,
          database,
          descriptionMarkdown: buildSchemaMigrationTaskDescription({
            nextSchemaDefinition: proposal.schemaDefinition,
            nextVersion: proposal.version,
            previousSchemaDefinition: previousVersion.schemaDefinition,
            previousVersion: previousVersion.version,
          }),
          model: null,
          organizationId,
          projectId,
          schemaVersion: proposal.version,
          sourceSchemaVersionId: previousVersion.id,
          targetSchemaVersionId: proposal.id,
          title: `Adopt schema v${proposal.version}`,
        })
      : null

  const actor = await projectSchemaVersionMachine.getActor(schemaVersionId)

  if (!actor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Schema proposal actor was not found.",
    })
  }

  const acceptedActor = await actor.send("accept", actor.context)

  if (acceptedActor.state !== "accepted") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Schema proposal could not be accepted from its current state.",
    })
  }

  await createActivityLogEvent({
    actorId: acceptedByUserId,
    actorType: "user",
    agentRunId: null,
    database,
    entityId: proposal.id,
    entityType: "projectSchemaVersion",
    eventType: "schema.version_created",
    organizationId,
    payload: {
      migrationTaskId: migrationTask?.id ?? null,
      version: proposal.version,
    },
    projectId,
    recordId: null,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: migrationTask?.id ?? null,
    taskRecordId: null,
  })

  return {
    ...proposal,
    migrationTaskId: migrationTask?.id ?? null,
    state: acceptedActor.state,
  }
}
