import { AgentRunDetailsPage } from "@/features/agent-runs/components/agent-run-details-page"

type PageProps = {
  params: Promise<{
    runId: string
  }>
}

const ProjectExecutionRunDetailsPage = async ({ params }: PageProps) => {
  const { runId } = await params

  return <AgentRunDetailsPage agentRunId={runId} />
}

export default ProjectExecutionRunDetailsPage
