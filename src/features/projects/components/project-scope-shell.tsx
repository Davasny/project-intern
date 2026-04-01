import Link from "next/link"
import type { ReactNode } from "react"
import { AppShell } from "@/components/ui/app-shell/app-shell"
import { AppShellHeader } from "@/components/ui/app-shell/app-shell-header"
import { AppShellSidebar } from "@/components/ui/app-shell/app-shell-sidebar"
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher"
import { ProjectSwitcher } from "@/features/projects/components/project-switcher"
import { SignOutButton } from "@/features/projects/components/sign-out-button"

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
  }
}

export const ProjectScopeShell = ({
  children,
  projectAccess,
}: ProjectScopeShellProps) => (
  <AppShell>
    <div className="mx-auto grid min-h-screen max-w-7xl gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <AppShellSidebar>
        <AppShellHeader>
          <div className="flex flex-col gap-1">
            <Link
              className="text-lg font-semibold tracking-tight"
              href="/app/select"
            >
              Project Intern
            </Link>
            <p className="text-sm text-slate-500">Protected project scope</p>
          </div>
          <SignOutButton />
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
        <nav className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}`}
          >
            Overview
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/tasks`}
          >
            Tasks
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/records`}
          >
            Records
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/settings/schema`}
          >
            Schema settings
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            href={`/app/${projectAccess.currentOrganization.slug}/${projectAccess.currentProject.slug}/settings/pipelines`}
          >
            Pipeline settings
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            href="/app/select"
          >
            Change scope
          </Link>
        </nav>
      </AppShellSidebar>
      <main className="flex flex-col gap-6">{children}</main>
    </div>
  </AppShell>
)
