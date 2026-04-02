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
          ? "bg-slate-900 text-white hover:bg-slate-800"
          : "bg-slate-100 text-slate-900 hover:bg-slate-200",
      )}
      href={`/app/${organizationSlug}/${project.slug}`}
    >
      {project.displayName}
    </Link>
  </li>
)
