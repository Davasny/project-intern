import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { writeInternRequirements } from "@/features/projects/lib/write-intern-requirements"
import { db } from "@/lib/db"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"
import { validateRuntimeTemperature } from "@/lib/llm/validate-runtime-temperature"
import { logger } from "@/lib/logger"

const updateProjectSettingsInputSchema = z.object({
  internPythonRequirements: z.string(),
  defaultModel: z.string().trim().min(1),
  defaultTemperature: z.number(),
  isAutopickEnabled: z.boolean(),
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
  const validatedTemperature = validateRuntimeTemperature({
    temperature: input.defaultTemperature,
  })

  if (!validatedModel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default model is not approved for runtime execution.",
    })
  }

  if (validatedTemperature === null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default temperature is required.",
    })
  }

  const [updated] = await db
    .update(projectTable)
    .set({
      internPythonRequirements: input.internPythonRequirements,
      defaultModel: validatedModel,
      defaultTemperature: validatedTemperature,
      isAutopickEnabled: input.isAutopickEnabled,
    })
    .where(eq(projectTable.id, project.id))
    .returning({
      internPythonRequirements: projectTable.internPythonRequirements,
      defaultModel: projectTable.defaultModel,
      defaultTemperature: projectTable.defaultTemperature,
      isAutopickEnabled: projectTable.isAutopickEnabled,
    })

  const requirementsFile = await writeInternRequirements({
    projectId: project.id,
    requirements: input.internPythonRequirements,
  })

  logger.info(
    {
      internPythonRequirementsBytes: Buffer.byteLength(
        input.internPythonRequirements,
        "utf8",
      ),
      defaultModel: validatedModel,
      defaultTemperature: validatedTemperature,
      isAutopickEnabled: input.isAutopickEnabled,
      projectId: project.id,
      requirementsPath: requirementsFile.requirementsPath,
      userId,
    },
    "Updated project default runtime settings",
  )

  return updated
}
