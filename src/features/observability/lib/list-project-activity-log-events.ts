import { listActivityLogEvents } from "@/features/observability/lib/list-activity-log-events"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"

type ListProjectActivityLogEventsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listProjectActivityLogEvents = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListProjectActivityLogEventsParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    return null
  }

  return listActivityLogEvents({
    projectId: project.id,
    recordIds: [],
    taskIds: [],
  })
}
