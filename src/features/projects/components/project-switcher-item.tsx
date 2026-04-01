import Link from "next/link"
import { Button } from "@/components/ui/button"

type ProjectSwitcherItemProps = {
  currentProjectSlug: string
  organizationSlug: string
  project: {
    displayName: string
    id: string
    slug: string
  }
}

export const ProjectSwitcherItem = ({
  currentProjectSlug,
  organizationSlug,
  project,
}: ProjectSwitcherItemProps) => (
  <li>
    <Button
      asChild
      className="w-full justify-start"
      variant={project.slug === currentProjectSlug ? "primary" : "secondary"}
    >
      <Link href={`/app/${organizationSlug}/${project.slug}`}>
        {project.displayName}
      </Link>
    </Button>
  </li>
)
