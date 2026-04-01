import { Button } from "@/components/ui/button"

type OrganizationSelectionItemProps = {
  isActive: boolean
  onSelect: (organizationSlug: string) => void
  organization: {
    id: string
    name: string
    slug: string
    role: string
  }
}

export const OrganizationSelectionItem = ({
  isActive,
  onSelect,
  organization,
}: OrganizationSelectionItemProps) => (
  <li>
    <Button
      className="w-full justify-between"
      onClick={() => onSelect(organization.slug)}
      variant={isActive ? "primary" : "secondary"}
    >
      <span>{organization.name}</span>
      <span className="text-xs uppercase tracking-[0.2em] opacity-80">
        {organization.role}
      </span>
    </Button>
  </li>
)
