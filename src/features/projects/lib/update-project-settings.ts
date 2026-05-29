import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { writeProjectAgentRequirements } from "@/features/projects/lib/write-project-agent-requirements"
import { db } from "@/lib/db"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"
import { validateRuntimeTemperature } from "@/lib/llm/validate-runtime-temperature"
import { logger } from "@/lib/logger"

const updateProjectSettingsInputSchema = z.object({
  agentPythonRequirements: z.string(),
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
      agentPythonRequirements: input.agentPythonRequirements,
      defaultModel: validatedModel,
      defaultTemperature: validatedTemperature,
      isAutopickEnabled: input.isAutopickEnabled,
    })
    .where(eq(projectTable.id, project.id))
    .returning({
      agentPythonRequirements: projectTable.agentPythonRequirements,
      defaultModel: projectTable.defaultModel,
      defaultTemperature: projectTable.defaultTemperature,
      isAutopickEnabled: projectTable.isAutopickEnabled,
    })

  const requirementsFile = await writeProjectAgentRequirements({
    projectId: project.id,
    requirements: input.agentPythonRequirements,
  })

  logger.info(
    {
      agentPythonRequirementsBytes: Buffer.byteLength(
        input.agentPythonRequirements,
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
