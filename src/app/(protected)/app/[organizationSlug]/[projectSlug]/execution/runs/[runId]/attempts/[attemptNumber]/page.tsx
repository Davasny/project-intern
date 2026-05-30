import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{
    attemptNumber: string
    organizationSlug: string
    projectSlug: string
    runId: string
  }>
}

const ProjectExecutionRunAttemptRedirect = async ({ params }: PageProps) => {
  const { attemptNumber, organizationSlug, projectSlug, runId } = await params

  redirect(
    `/app/${organizationSlug}/${projectSlug}/runs/${runId}/attempts/${attemptNumber}`,
  )
}

export default ProjectExecutionRunAttemptRedirect
