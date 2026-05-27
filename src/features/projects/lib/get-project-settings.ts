import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { backendConfig } from "@/lib/config/backend"
import { db } from "@/lib/db"

type GetProjectSettingsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getProjectSettings = async ({
  organizationSlug,
  projectSlug,
  userId,
}: GetProjectSettingsParams) => {
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

  const settings = await db
    .select({
      defaultModel: projectTable.defaultModel,
      defaultTemperature: projectTable.defaultTemperature,
    })
    .from(projectTable)
    .where(eq(projectTable.id, project.id))
    .then((rows) => rows[0] ?? null)

  if (!settings) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project settings were not found.",
    })
  }

  return {
    ...settings,
    approvedModels: backendConfig.CRM_APPROVED_RUNTIME_MODELS,
  }
}
