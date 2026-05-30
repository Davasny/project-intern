import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

const ProjectExecutionRunsRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug } = await params
  redirect(`/app/${organizationSlug}/${projectSlug}/runs`)
}

export default ProjectExecutionRunsRedirect
