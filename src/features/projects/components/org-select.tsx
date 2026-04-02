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
import { FieldLabel, Field } from "@/components/ui/field"

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
    <Field>
      <FieldLabel>Organization</FieldLabel>

      <Select
        value={currentOrganizationSlug}
        onValueChange={(v) => router.push(`/app/${v}`)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Theme" />
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
    </Field>
  )
}
