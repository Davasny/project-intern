import { TRPCError } from "@trpc/server"
import { createProjectSchemaVersionProposal } from "@/features/project-schema/lib/create-project-schema-version-proposal"
import { getSchemaWriteMode } from "@/features/project-schema/lib/get-schema-write-mode"
import { getProjectSchemaVersionActor } from "@/features/project-schema/lib/project-schema-version-machine"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type CreateProjectSchemaVersionDraftParams = {
  customFields: unknown[]
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createProjectSchemaVersionDraft = async ({
  customFields,
  organizationSlug,
  projectSlug,
  userId,
}: CreateProjectSchemaVersionDraftParams) => {
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
      const actor = await getProjectSchemaVersionActor(
        writeMode.activeVersion.id,
      )

      const updatedActor = await actor.send("update", {
        actorId: userId,
        organizationId: project.organizationId,
        schemaDefinition,
        schemaVersionId: writeMode.activeVersion.id,
      })

      if (updatedActor.state !== "accepted") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Schema version could not be updated.",
        })
      }

      return {
        id: writeMode.activeVersion.id,
        projectId: project.id,
        schemaDefinition,
        state: updatedActor.state,
        version: writeMode.activeVersion.version,
      }
    }

    const generatedIds = await generateUuidV7Values({
      count: 1,
      database: tx,
    })
    const schemaVersionId = generatedIds[0]

    if (!schemaVersionId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Schema draft id could not be generated.",
      })
    }

    const proposal = await createProjectSchemaVersionProposal({
      database: tx,
      id: schemaVersionId,
      parentVersionId: writeMode.activeVersion.id,
      projectId: project.id,
      proposedBy: userId,
      schemaDefinition,
      version: writeMode.activeVersion.version + 1,
    })

    if (!proposal) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Schema draft could not be created.",
      })
    }

    return proposal
  })
}
