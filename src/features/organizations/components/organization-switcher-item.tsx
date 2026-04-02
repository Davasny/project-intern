import Link from "next/link"
import { cn } from "@/utils/cn"

type OrganizationSwitcherItemProps = {
  isActive: boolean
  organization: {
    id: string
    name: string
    slug: string
  }
}

export const OrganizationSwitcherItem = ({
  isActive,
  organization,
}: OrganizationSwitcherItemProps) => (
  <li>
    <Link
      className={cn(
        "flex w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "bg-muted text-foreground hover:bg-accent",
      )}
      href={`/app/${organization.slug}`}
    >
      {organization.name}
    </Link>
  </li>
)
