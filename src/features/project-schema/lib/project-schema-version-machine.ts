import { and, eq, sql } from "drizzle-orm"
import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { buildSchemaMigrationTaskDescription } from "@/features/project-schema/lib/build-schema-migration-task-description"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { createProjectTask } from "@/features/tasks/lib/create-project-task"
import { db } from "@/lib/db"

type ProjectSchemaVersionMachineContext = {
  parentVersionId: string | null
  projectId: string
  proposedBy: string | null
  schemaDefinition: ProjectSchemaDefinition
  version: number
}

type AcceptedEvent = {
  acceptedByUserId: string
  organizationId: string
  previousVersionId: string | null
  previousVersionNumber: number | null
  previousSchemaDefinition: ProjectSchemaDefinition | null
  schemaVersionId: string
}

type RejectedEvent = {
  organizationId: string
  rejectedByUserId: string
  schemaVersionId: string
}

type UpdatingEvent = {
  actorId: string
  organizationId: string
  schemaDefinition: ProjectSchemaDefinition
  schemaVersionId: string
}

const projectSchemaVersionMachineDefinition =
  machine<ProjectSchemaVersionMachineContext>().define({
    initial: "created",
    states: {
      accepted: {
        entry: async (context, event: AcceptedEvent) => {
          await db
            .update(projectTable)
            .set({ activeSchemaVersionId: event.schemaVersionId })
            .where(eq(projectTable.id, context.projectId))

          const [{ recordCount }] = await db
            .select({ recordCount: sql<number>`count(*)::int` })
            .from(recordTable)
            .where(eq(recordTable.projectId, context.projectId))

          const migrationTask =
            event.previousVersionId && recordCount > 0
              ? await createProjectTask({
                  createdByUserId: event.acceptedByUserId,
                  database: db,
                  descriptionMarkdown: buildSchemaMigrationTaskDescription({
                    nextSchemaDefinition: context.schemaDefinition,
                    nextVersion: context.version,
                    previousSchemaDefinition: event.previousSchemaDefinition!,
                    previousVersion: event.previousVersionNumber!,
                  }),
                  model: null,
                  temperature: null,
                  organizationId: event.organizationId,
                  projectId: context.projectId,
                  schemaVersion: context.version,
                  sourceSchemaVersionId: event.previousVersionId,
                  targetSchemaVersionId: event.schemaVersionId,
                  title: `Adopt schema v${context.version}`,
                })
              : null

          await createActivityLogEvent({
            actorId: event.acceptedByUserId,
            actorType: "user",
            agentRunId: null,
            database: db,
            entityId: event.schemaVersionId,
            entityType: "projectSchemaVersion",
            eventType: "schema.version_created",
            organizationId: event.organizationId,
            payload: {
              migrationTaskId: migrationTask?.id ?? null,
              version: context.version,
            },
            projectId: context.projectId,
            recordId: null,
            relatedProjectId: null,
            relatedRecordId: null,
            taskId: migrationTask?.id ?? null,
            taskRecordId: null,
          })

          return context
        },
        on: {
          update: { target: "updating" },
        },
        onSuccess: { target: "accepted" },
        onError: { target: "accepted_failed" },
      },
      accepted_failed: {
        on: { retry: { target: "accepted" } },
      },
      created: {
        on: {
          accept: { target: "accepted" },
          reject: { target: "rejected" },
        },
      },
      rejected: {
        entry: async (context, event: RejectedEvent) => {
          await createActivityLogEvent({
            actorId: event.rejectedByUserId,
            actorType: "user",
            agentRunId: null,
            database: db,
            entityId: event.schemaVersionId,
            entityType: "projectSchemaVersion",
            eventType: "schema.version_rejected",
            organizationId: event.organizationId,
            payload: {
              version: context.version,
            },
            projectId: context.projectId,
            recordId: null,
            relatedProjectId: null,
            relatedRecordId: null,
            taskId: null,
            taskRecordId: null,
          })

          return context
        },
        onSuccess: { target: "rejected" },
        onError: { target: "rejected_failed" },
      },
      rejected_failed: {
        on: { retry: { target: "rejected" } },
      },
      updating: {
        entry: async (context, event: UpdatingEvent) => {
          const [updated] = await db
            .update(projectSchemaVersionTable)
            .set({ schemaDefinition: event.schemaDefinition })
            .where(
              and(
                eq(projectSchemaVersionTable.id, event.schemaVersionId),
                eq(projectSchemaVersionTable.state, "accepted"),
              ),
            )
            .returning()

          if (!updated) {
            throw new Error("Schema version could not be updated.")
          }

          await createActivityLogEvent({
            actorId: event.actorId,
            actorType: "user",
            agentRunId: null,
            database: db,
            entityId: updated.id,
            entityType: "projectSchemaVersion",
            eventType: "schema.version_edited_in_place",
            organizationId: event.organizationId,
            payload: {
              version: updated.version,
            },
            projectId: updated.projectId,
            recordId: null,
            relatedProjectId: null,
            relatedRecordId: null,
            taskId: null,
            taskRecordId: null,
          })

          return {
            ...context,
            schemaDefinition: event.schemaDefinition,
          }
        },
        onSuccess: { target: "accepted" },
        onError: { target: "updating_failed" },
      },
      updating_failed: {
        on: { retry: { target: "updating" } },
      },
    },
  })

const projectSchemaVersionMachine = withDrizzlePg(
  projectSchemaVersionMachineDefinition,
  {
    db,
    table: projectSchemaVersionTable,
  },
)

export const createProjectSchemaVersionActor = async (
  id: string,
  context: ProjectSchemaVersionMachineContext,
) => projectSchemaVersionMachine.createActor(id, context)

export const getProjectSchemaVersionActor = async (schemaVersionId: string) => {
  const actor = await projectSchemaVersionMachine.getActor(schemaVersionId)

  if (!actor) {
    throw new Error(`Schema version ${schemaVersionId} not found.`)
  }

  return actor
}
