import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { deleteProjectFiles } from "@/features/projects/lib/delete-project-files"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type DeleteProjectParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const deleteProject = async ({
  organizationSlug,
  projectSlug,
  userId,
}: DeleteProjectParams) => {
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

  try {
    const [deletedProject] = await db
      .delete(projectTable)
      .where(eq(projectTable.id, project.id))
      .returning({
        displayName: projectTable.displayName,
        id: projectTable.id,
        organizationId: projectTable.organizationId,
        slug: projectTable.slug,
      })

    if (!deletedProject) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found.",
      })
    }

    await deleteProjectFiles({
      organizationId: deletedProject.organizationId,
      projectId: deletedProject.id,
    })

    logger.info(
      {
        organizationId: deletedProject.organizationId,
        projectId: deletedProject.id,
        projectSlug: deletedProject.slug,
        userId,
      },
      "Project deleted",
    )

    return deletedProject
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    logger.error(
      { error, organizationId: project.organizationId, projectId: project.id },
      "Failed to delete project",
    )
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete the project.",
    })
  }
}
