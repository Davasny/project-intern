import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
    internRunId: string
  }>
}

const ProjectExecutionInternRunDetailsRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug, internRunId } = await params

  redirect(`/app/${organizationSlug}/${projectSlug}/intern-runs/${internRunId}`)
}

export default ProjectExecutionInternRunDetailsRedirect
