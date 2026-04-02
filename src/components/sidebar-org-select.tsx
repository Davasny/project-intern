"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjectScope } from "@/features/projects/context/project-scope-context"

export const SidebarOrgSelect = () => {
  const router = useRouter()
  const { organizations, currentOrganization, projectSlug } = useProjectScope()

  const handleValueChange = (orgSlug: string) => {
    router.push(`/app/${orgSlug}/${projectSlug}`)
  }

  return (
    <Select
      value={currentOrganization?.slug ?? ""}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.slug}>
              {org.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
