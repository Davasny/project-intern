import { OrganizationSwitcherItem } from "@/features/organizations/components/organization-switcher-item"

type OrganizationSwitcherProps = {
  currentOrganizationSlug: string
  organizations: Array<{
    id: string
    name: string
    slug: string
  }>
}

export const OrganizationSwitcher = ({
  currentOrganizationSlug,
  organizations,
}: OrganizationSwitcherProps) => (
  <div className="flex flex-col gap-2">
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
      Organizations
    </p>
    <ul className="flex flex-col gap-2">
      {organizations.map((organization) => (
        <OrganizationSwitcherItem
          isActive={organization.slug === currentOrganizationSlug}
          key={organization.id}
          organization={organization}
        />
      ))}
    </ul>
  </div>
)
