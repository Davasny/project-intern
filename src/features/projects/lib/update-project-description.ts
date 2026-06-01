import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const updateProjectDescriptionInputSchema = z.object({
  descriptionMarkdown: z.string(),
})

type UpdateProjectDescriptionParams = {
  input: z.infer<typeof updateProjectDescriptionInputSchema>
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const updateProjectDescription = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: UpdateProjectDescriptionParams) => {
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

  const [updated] = await db
    .update(projectTable)
    .set({
      descriptionMarkdown: input.descriptionMarkdown,
    })
    .where(eq(projectTable.id, project.id))
    .returning({
      descriptionMarkdown: projectTable.descriptionMarkdown,
    })

  logger.info(
    {
      projectDescriptionBytes: Buffer.byteLength(
        input.descriptionMarkdown,
        "utf8",
      ),
      projectId: project.id,
      userId,
    },
    "Updated project description",
  )

  return updated
}
