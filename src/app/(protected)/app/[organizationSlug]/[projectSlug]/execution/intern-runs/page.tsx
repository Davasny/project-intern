import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

const ProjectExecutionInternRunsRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug } = await params
  redirect(`/app/${organizationSlug}/${projectSlug}/intern-runs`)
}

export default ProjectExecutionInternRunsRedirect
