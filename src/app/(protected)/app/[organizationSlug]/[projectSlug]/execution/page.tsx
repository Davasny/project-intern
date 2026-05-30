import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

const ProjectExecutionRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug } = await params
  redirect(`/app/${organizationSlug}/${projectSlug}`)
}

export default ProjectExecutionRedirect
