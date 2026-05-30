import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
    runId: string
  }>
}

const ProjectExecutionRunDetailsRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug, runId } = await params

  redirect(
    `/app/${organizationSlug}/${projectSlug}/runs/${runId}`,
  )
}

export default ProjectExecutionRunDetailsRedirect
