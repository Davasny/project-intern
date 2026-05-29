import { TRPCError } from "@trpc/server"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { acceptTaskDraft } from "@/features/tasks/lib/accept-task-draft"
import { db } from "@/lib/db"

type AcceptTaskDraftByIdParams = {
  organizationSlug: string
  projectSlug: string
  taskId: string
  userId: string
}

export const acceptTaskDraftById = async ({
  organizationSlug,
  projectSlug,
  taskId,
  userId,
}: AcceptTaskDraftByIdParams) => {
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

  return acceptTaskDraft({
    acceptedByUserId: userId,
    database: db,
    projectId: project.id,
    taskId,
  })
}
