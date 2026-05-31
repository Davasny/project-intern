import { redirect } from "next/navigation"
import { getInternRunById } from "@/features/intern-runs/lib/get-intern-run-by-id"
import { getRequiredAuthSession } from "@/features/auth/utils/get-required-auth-session"

type PageProps = {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
    internRunId: string
  }>
}

const ProjectInternRunDetailsRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug, internRunId } = await params
  const session = await getRequiredAuthSession()
  const run = await getInternRunById({
    internRunId,
    organizationSlug,
    projectSlug,
    userId: session.user.id,
  })

  redirect(
    `/app/${organizationSlug}/${projectSlug}/intern-runs/${internRunId}/attempts/${String(run.attemptNumber)}`,
  )
}

export default ProjectInternRunDetailsRedirect
