import { notFound } from "next/navigation"
import { getRequiredAuthSession } from "@/features/auth/utils/get-required-auth-session"
import { ProjectScopeShell } from "@/features/projects/components/project-scope-shell"
import { resolveProjectAccess } from "@/features/projects/lib/resolve-project-access"

const ProjectScopeLayout = async ({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}>) => {
  const { organizationSlug, projectSlug } = await params
  const session = await getRequiredAuthSession()

  const hasAccess = await resolveProjectAccess({
    userId: session.user.id,
    organizationSlug,
    projectSlug,
  })

  if (!hasAccess) {
    notFound()
  }

  return (
    <ProjectScopeShell
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      user={{
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        avatar: session.user.image ?? undefined,
      }}
    >
      {children}
    </ProjectScopeShell>
  )
}

export default ProjectScopeLayout
