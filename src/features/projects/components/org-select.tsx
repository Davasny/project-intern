"use client"

import { useRouter } from "next/navigation"

type OrgSelectProps = {
  currentOrganizationSlug: string
  organizations: Array<{
    id: string
    name: string
    slug: string
  }>
}

export function OrgSelect({
  currentOrganizationSlug,
  organizations,
}: OrgSelectProps) {
  const router = useRouter()

  return (
    <select
      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-900"
      value={currentOrganizationSlug}
      onChange={(e) => {
        router.push(`/app/${e.target.value}`)
      }}
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.slug}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
