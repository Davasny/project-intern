import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"
import { logger } from "@/lib/logger"

const updateProjectSettingsInputSchema = z.object({
  defaultModel: z.string().trim().min(1),
})

type UpdateProjectSettingsParams = {
  input: z.infer<typeof updateProjectSettingsInputSchema>
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const updateProjectSettings = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: UpdateProjectSettingsParams) => {
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

  const validatedModel = validateApprovedTaskModel({
    model: input.defaultModel,
  })

  if (!validatedModel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default model is not approved for runtime execution.",
    })
  }

  const [updated] = await db
    .update(projectTable)
    .set({ defaultModel: validatedModel })
    .where(eq(projectTable.id, project.id))
    .returning({
      defaultModel: projectTable.defaultModel,
    })

  logger.info(
    { projectId: project.id, userId, defaultModel: validatedModel },
    "Updated project default model",
  )

  return updated
}
