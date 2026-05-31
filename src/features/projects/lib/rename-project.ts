import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { createUniqueProjectSlug } from "@/features/projects/lib/create-unique-project-slug"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type RenameProjectParams = {
  displayName: string
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const renameProject = async ({
  displayName,
  organizationSlug,
  projectSlug,
  userId,
}: RenameProjectParams) => {
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

  const slug = await createUniqueProjectSlug({
    displayName,
    excludedProjectId: project.id,
    organizationId: project.organizationId,
  })

  const [updatedProject] = await db
    .update(projectTable)
    .set({ displayName, slug })
    .where(eq(projectTable.id, project.id))
    .returning({
      displayName: projectTable.displayName,
      id: projectTable.id,
      slug: projectTable.slug,
    })

  if (!updatedProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found.",
    })
  }

  logger.info(
    {
      nextProjectSlug: updatedProject.slug,
      previousProjectSlug: project.slug,
      projectId: project.id,
      userId,
    },
    "Project renamed",
  )

  return updatedProject
}
