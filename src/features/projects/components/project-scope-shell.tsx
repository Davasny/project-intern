import type { ReactNode } from "react"
import type { NavUserProps } from "@/components/nav-user"
import { AppShell } from "../../../components/app-shell"
import { ProjectScopeProvider } from "../context/project-scope-provider"

type ProjectScopeShellProps = {
  children: ReactNode
  organizationSlug: string
  projectSlug: string
  user: NavUserProps
}

export const ProjectScopeShell = ({
  children,
  organizationSlug,
  projectSlug,
  user,
}: ProjectScopeShellProps) => {
  return (
    <ProjectScopeProvider
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    >
      <AppShell user={user}>
        <main className="flex min-w-0 flex-col gap-6">{children}</main>
      </AppShell>
    </ProjectScopeProvider>
  )
}
