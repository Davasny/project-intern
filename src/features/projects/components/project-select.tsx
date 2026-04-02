"use client"

import { useRouter } from "next/navigation"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ProjectSelectProps = {
  currentProjectSlug: string
  organizationSlug: string
  projects: Array<{
    displayName: string
    id: string
    slug: string
  }>
}

export function ProjectSelect({
  currentProjectSlug,
  organizationSlug,
  projects,
}: ProjectSelectProps) {
  const router = useRouter()

  return (
    <Field>
      <FieldLabel>Project</FieldLabel>

      <Select
        value={currentProjectSlug}
        onValueChange={(v) => router.push(`/app/${organizationSlug}/${v}`)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.slug}>
                {project.displayName}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
