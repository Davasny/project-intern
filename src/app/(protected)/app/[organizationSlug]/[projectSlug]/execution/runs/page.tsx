import { AgentRunListPage } from "@/features/agent-runs/components/agent-run-list-page"

const ProjectExecutionRunsPage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <AgentRunListPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default ProjectExecutionRunsPage
