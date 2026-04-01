import Link from "next/link"
import { Button } from "@/components/ui/button"

type ProjectSelectionItemProps = {
  organizationSlug: string
  project: {
    displayName: string
    id: string
    slug: string
  }
}

export const ProjectSelectionItem = ({
  organizationSlug,
  project,
}: ProjectSelectionItemProps) => (
  <li>
    <Button asChild className="w-full justify-between" variant="secondary">
      <Link href={`/app/${organizationSlug}/${project.slug}`}>
        <span>{project.displayName}</span>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {project.slug}
        </span>
      </Link>
    </Button>
  </li>
)
