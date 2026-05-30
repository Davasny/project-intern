import { redirect } from "next/navigation"
import { getAgentRunById } from "@/features/agent-runs/lib/get-agent-run-by-id"
import { getRequiredAuthSession } from "@/features/auth/utils/get-required-auth-session"

type PageProps = {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
    runId: string
  }>
}

const ProjectRunDetailsRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug, runId } = await params
  const session = await getRequiredAuthSession()
  const run = await getAgentRunById({
    agentRunId: runId,
    organizationSlug,
    projectSlug,
    userId: session.user.id,
  })

  redirect(
    `/app/${organizationSlug}/${projectSlug}/runs/${runId}/attempts/${String(run.attemptNumber)}`,
  )
}

export default ProjectRunDetailsRedirect
