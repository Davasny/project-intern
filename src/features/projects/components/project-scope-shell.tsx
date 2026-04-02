import type { ReactNode } from "react"
import { OrgSelect } from "@/features/projects/components/org-select"
import { ProjectSelect } from "@/features/projects/components/project-select"
import { AppShell } from "../../../../components/app-shell"

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
    userEmail: string
    userAvatar?: string
  }
}

const projectNavItems = (organizationSlug: string, projectSlug: string) => [
  {
    href: `/app/${organizationSlug}/${projectSlug}`,
    label: "Overview",
  },
  {
    href: `/app/${organizationSlug}/${projectSlug}/tasks`,
    label: "Tasks",
  },
  {
    href: `/app/${organizationSlug}/${projectSlug}/records`,
    label: "Records",
  },
  {
    href: `/app/${organizationSlug}/${projectSlug}/settings/schema`,
    label: "Schema settings",
  },
  {
    href: `/app/${organizationSlug}/${projectSlug}/settings/pipelines`,
    label: "Pipeline settings",
  },
  {
    href: `/app/${organizationSlug}/${projectSlug}/activity`,
    label: "Activity log",
  },
  {
    href: `/app/${organizationSlug}/${projectSlug}/execution`,
    label: "Execution monitor",
  },
]

export const ProjectScopeShell = ({
  children,
  projectAccess,
}: ProjectScopeShellProps) => (
  <AppShell
    organizationSwitcher={
      <OrgSelect
        currentOrganizationSlug={projectAccess.currentOrganization.slug}
        organizations={projectAccess.organizations}
      />
    }
    projectSwitcher={
      <ProjectSelect
        currentProjectSlug={projectAccess.currentProject.slug}
        organizationSlug={projectAccess.currentOrganization.slug}
        projects={projectAccess.projects}
      />
    }
    navItems={projectNavItems(
      projectAccess.currentOrganization.slug,
      projectAccess.currentProject.slug,
    )}
    user={{
      name: projectAccess.userDisplayName,
      email: projectAccess.userEmail,
      avatar: projectAccess.userAvatar,
    }}
  >
    <main className="flex flex-col gap-6">{children}</main>
  </AppShell>
)
