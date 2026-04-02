import { AgentRunDetailsPage } from "@/features/agent-runs/components/agent-run-details-page"

type PageProps = {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
    runId: string
  }>
}

const ProjectExecutionRunDetailsPage = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug, runId } = await params

  return (
    <AgentRunDetailsPage
      agentRunId={runId}
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default ProjectExecutionRunDetailsPage
