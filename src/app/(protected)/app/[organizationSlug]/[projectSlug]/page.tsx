import { ProjectOverviewPage } from "@/features/projects/components/project-overview-page"

const ProjectOverviewRoutePage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <ProjectOverviewPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default ProjectOverviewRoutePage
