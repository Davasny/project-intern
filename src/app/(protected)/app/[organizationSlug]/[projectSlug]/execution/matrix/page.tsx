import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

const ProjectExecutionMatrixRedirect = async ({ params }: PageProps) => {
  const { organizationSlug, projectSlug } = await params
  redirect(`/app/${organizationSlug}/${projectSlug}`)
}

export default ProjectExecutionMatrixRedirect
