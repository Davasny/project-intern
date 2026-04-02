import Link from "next/link"
import { cn } from "@/utils/cn"

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
    <Link
      className={cn(
        "flex w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        project.slug === currentProjectSlug
          ? "bg-accent text-accent-foreground"
          : "bg-muted text-foreground hover:bg-accent",
      )}
      href={`/app/${organizationSlug}/${project.slug}`}
    >
      {project.displayName}
    </Link>
  </li>
)
