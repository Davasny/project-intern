import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { acceptProjectSchemaVersionProposal } from "@/features/project-schema/lib/accept-project-schema-version-proposal"
import { createProjectSchemaVersionProposal } from "@/features/project-schema/lib/create-project-schema-version-proposal"
import { getSchemaWriteMode } from "@/features/project-schema/lib/get-schema-write-mode"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"

type CreateProjectSchemaVersionParams = {
  customFields: unknown[]
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createProjectSchemaVersion = async ({
  customFields,
  organizationSlug,
  projectSlug,
  userId,
}: CreateProjectSchemaVersionParams) => {
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

  const schemaDefinition = validateProjectSchemaDefinition(customFields)

  return db.transaction(async (tx) => {
    const writeMode = await getSchemaWriteMode({
      database: tx,
      projectId: project.id,
    })

    if (!writeMode) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active schema version found for this project.",
      })
    }

    if (writeMode.mode === "in_place") {
      const [updated] = await tx
        .update(projectSchemaVersionTable)
        .set({ schemaDefinition })
        .where(
          and(
            eq(projectSchemaVersionTable.id, writeMode.activeVersion.id),
            eq(projectSchemaVersionTable.state, "accepted"),
          ),
        )
        .returning({
          id: projectSchemaVersionTable.id,
          projectId: projectSchemaVersionTable.projectId,
          schemaDefinition: projectSchemaVersionTable.schemaDefinition,
          state: projectSchemaVersionTable.state,
          version: projectSchemaVersionTable.version,
        })

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Schema version could not be updated.",
        })
      }

      await createActivityLogEvent({
        actorId: userId,
        actorType: "user",
        agentRunId: null,
        database: tx,
        entityId: updated.id,
        entityType: "projectSchemaVersion",
        eventType: "schema.version_edited_in_place",
        organizationId: project.organizationId,
        payload: {
          version: updated.version,
        },
        projectId: project.id,
        recordId: null,
        relatedProjectId: null,
        relatedRecordId: null,
        taskId: null,
        taskRecordId: null,
      })

      return updated
    }

    const createdProposal = await createProjectSchemaVersionProposal({
      database: tx,
      projectId: project.id,
      proposedBy: userId,
      schemaDefinition,
    })

    if (!createdProposal) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Schema proposal could not be created.",
      })
    }

    return acceptProjectSchemaVersionProposal({
      acceptedByUserId: userId,
      database: tx,
      organizationId: project.organizationId,
      projectId: project.id,
      schemaVersionId: createdProposal.id,
    })
  })
}
