import Link from "next/link"
import { Button } from "@/components/ui/button"

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
    <Button
      asChild
      className="w-full justify-start"
      variant={isActive ? "primary" : "secondary"}
    >
      <Link href={`/app/${organization.slug}`}>{organization.name}</Link>
    </Button>
  </li>
)
