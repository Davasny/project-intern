import { ExecutionMonitorPage } from "@/features/execution/components/execution-monitor-page"

const ProjectExecutionPage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <ExecutionMonitorPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default ProjectExecutionPage
