import { TRPCError } from "@trpc/server"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { rejectTaskDraft } from "@/features/tasks/lib/reject-task-draft"
import { db } from "@/lib/db"

type RejectTaskDraftByIdParams = {
  organizationSlug: string
  projectSlug: string
  taskId: string
  userId: string
}

export const rejectTaskDraftById = async ({
  organizationSlug,
  projectSlug,
  taskId,
  userId,
}: RejectTaskDraftByIdParams) => {
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

  return rejectTaskDraft({
    database: db,
    projectId: project.id,
    rejectedByUserId: userId,
    taskId,
  })
}
