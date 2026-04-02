import Link from "next/link"
import type { ReactNode } from "react"
import { AppShell } from "@/components/ui/app-shell/app-shell"
import { AppShellHeader } from "@/components/ui/app-shell/app-shell-header"
import { AppShellSidebar } from "@/components/ui/app-shell/app-shell-sidebar"
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher"
import { ProjectScopeAccountMenu } from "@/features/projects/components/project-scope-account-menu"
import { ProjectScopeNavLink } from "@/features/projects/components/project-scope-nav-link"
import { ProjectSwitcher } from "@/features/projects/components/project-switcher"

type ProjectScopeShellProps = {
  children: ReactNode
  projectAccess: {
    currentOrganization: {
      id: string
      name: string
      slug: string
    }
    currentProject: {
      displayName: string
      id: string
      slug: string
    }
    organizations: Array<{
      id: string
      name: string
      slug: string
    }>
    projects: Array<{
      displayName: string
      id: string
      slug: string
    }>
    userDisplayName: string
  }
}

export const ProjectScopeShell = ({
  children,
  projectAccess,
}: ProjectScopeShellProps) => (
  <AppShell>
    <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <AppShellSidebar>
        <div className="flex h-full flex-col gap-6">
          <div className="flex flex-col gap-6">
            <AppShellHeader>
              <div className="flex flex-col gap-1">
                <Link
                  className="text-lg font-semibold tracking-tight text-slate-950"
                  href="/app/select"
                >
                  Project Intern
                </Link>
                <p className="text-sm text-slate-500">
                  Protected project scope
                </p>
              </div>
            </AppShellHeader>
            <OrganizationSwitcher
              currentOrganizationSlug={projectAccess.currentOrganization.slug}
              organizations={projectAccess.organizations}
            />
            <ProjectSwitcher
              currentProjectSlug={projectAccess.currentProject.slug}
              organizationSlug={projectAccess.currentOrganization.slug}
              projects={projectAccess.projects}
            />
            <nav className="flex flex-col gap-2 pt-4">
              <ProjectScopeNavLink
                href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}`}
                label="Overview"
              />
              <ProjectScopeNavLink
                href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/tasks`}
                label="Tasks"
              />
              <ProjectScopeNavLink
                href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/records`}
                label="Records"
              />
              <ProjectScopeNavLink
                href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/settings/schema`}
                label="Schema settings"
              />
              <ProjectScopeNavLink
                href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/settings/pipelines`}
                label="Pipeline settings"
              />
              <ProjectScopeNavLink
                href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/activity`}
                label="Activity log"
              />
              <ProjectScopeNavLink
                href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/execution`}
                label="Execution monitor"
              />
              <ProjectScopeNavLink href="/app/select" label="Change scope" />
            </nav>
          </div>
          <div className="mt-auto">
            <ProjectScopeAccountMenu
              userDisplayName={projectAccess.userDisplayName}
            />
          </div>
        </div>
      </AppShellSidebar>
      <main className="flex flex-col gap-6">{children}</main>
    </div>
  </AppShell>
)
