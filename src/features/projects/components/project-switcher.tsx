import { ProjectSwitcherItem } from "@/features/projects/components/project-switcher-item"

type ProjectSwitcherProps = {
  currentProjectSlug: string
  organizationSlug: string
  projects: Array<{
    displayName: string
    id: string
    slug: string
  }>
}

export const ProjectSwitcher = ({
  currentProjectSlug,
  organizationSlug,
  projects,
}: ProjectSwitcherProps) => (
  <div className="flex flex-col gap-2">
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
      Projects
    </p>
    <ul className="flex flex-col gap-2">
      {projects.map((project) => (
        <ProjectSwitcherItem
          currentProjectSlug={currentProjectSlug}
          key={project.id}
          organizationSlug={organizationSlug}
          project={project}
        />
      ))}
    </ul>
  </div>
)
