import { OrganizationSelectionItem } from "@/features/organizations/components/organization-selection-item"

type OrganizationSelectionListProps = {
  onSelect: (organizationSlug: string) => void
  organizations: Array<{
    id: string
    name: string
    slug: string
    role: string
  }>
  selectedOrganizationSlug: string
}

export const OrganizationSelectionList = ({
  onSelect,
  organizations,
  selectedOrganizationSlug,
}: OrganizationSelectionListProps) => (
  <ul className="flex flex-col gap-2">
    {organizations.map((organization) => (
      <OrganizationSelectionItem
        isActive={organization.slug === selectedOrganizationSlug}
        key={organization.id}
        onSelect={onSelect}
        organization={organization}
      />
    ))}
  </ul>
)
