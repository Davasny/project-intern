import { ActivityLogPage } from "@/features/observability/components/activity-log-page"

const ProjectActivityPage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <ActivityLogPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default ProjectActivityPage
