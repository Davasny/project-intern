import { notFound } from "next/navigation"
import { AgentRunDetailsPage } from "@/features/agent-runs/components/agent-run-details-page"

type PageProps = {
  params: Promise<{
    attemptNumber: string
    runId: string
  }>
}

const ProjectRunAttemptDetailsPage = async ({ params }: PageProps) => {
  const { attemptNumber, runId } = await params
  const parsedAttemptNumber = Number(attemptNumber)

  if (!Number.isInteger(parsedAttemptNumber) || parsedAttemptNumber < 1) {
    notFound()
  }

  return (
    <AgentRunDetailsPage
      anchorAgentRunId={runId}
      attemptNumber={parsedAttemptNumber}
    />
  )
}

export default ProjectRunAttemptDetailsPage
