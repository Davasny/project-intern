import { ProjectSelectionItem } from "@/features/projects/components/project-selection-item"

type ProjectSelectionListProps = {
  organizationSlug: string
  projects: Array<{
    displayName: string
    id: string
    slug: string
  }>
}

export const ProjectSelectionList = ({
  organizationSlug,
  projects,
}: ProjectSelectionListProps) => (
  <ul className="flex flex-col gap-2">
    {projects.map((project) => (
      <ProjectSelectionItem
        key={project.id}
        organizationSlug={organizationSlug}
        project={project}
      />
    ))}
  </ul>
)
