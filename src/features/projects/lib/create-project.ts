import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { validateProjectSchemaDefinition } from "@/features/project-schema/lib/validate-project-schema-definition"
import { projectTable } from "@/features/projects/db"
import { createUniqueProjectSlug } from "@/features/projects/lib/create-unique-project-slug"
import { ensureOrganizationAccess } from "@/features/projects/lib/ensure-organization-access"
import { backendConfig } from "@/lib/config/backend"
import { db } from "@/lib/db"

type CreateProjectParams = {
  displayName: string
  organizationSlug: string
  userId: string
}

export const createProject = async ({
  displayName,
  organizationSlug,
  userId,
}: CreateProjectParams) => {
  const organization = await ensureOrganizationAccess({
    organizationSlug,
    userId,
  })

  if (!organization) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization.",
    })
  }

  const projectSlug = await createUniqueProjectSlug({
    displayName,
    excludedProjectId: null,
    organizationId: organization.id,
  })

  return db.transaction(async (transaction) => {
    const [project] = await transaction
      .insert(projectTable)
      .values({
        defaultModel: backendConfig.CRM_DEFAULT_RUNTIME_MODEL,
        defaultTemperature: 0.5,
        displayName,
        organizationId: organization.id,
        slug: projectSlug,
      })
      .returning({
        displayName: projectTable.displayName,
        id: projectTable.id,
        slug: projectTable.slug,
      })

    const [schemaVersion] = await transaction
      .insert(projectSchemaVersionTable)
      .values({
        projectId: project.id,
        proposedBy: null,
        schemaDefinition: validateProjectSchemaDefinition([]),
        state: "accepted",
        version: 1,
      })
      .returning({
        id: projectSchemaVersionTable.id,
      })

    await transaction
      .update(projectTable)
      .set({ activeSchemaVersionId: schemaVersion.id })
      .where(eq(projectTable.id, project.id))

    return project
  })
}
