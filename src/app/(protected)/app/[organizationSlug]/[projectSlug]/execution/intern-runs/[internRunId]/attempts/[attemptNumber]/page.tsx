import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{
    attemptNumber: string
    organizationSlug: string
    projectSlug: string
    internRunId: string
  }>
}

const ProjectExecutionInternRunAttemptRedirect = async ({ params }: PageProps) => {
  const { attemptNumber, organizationSlug, projectSlug, internRunId } = await params

  redirect(
    `/app/${organizationSlug}/${projectSlug}/intern-runs/${internRunId}/attempts/${attemptNumber}`,
  )
}

export default ProjectExecutionInternRunAttemptRedirect
