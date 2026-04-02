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

export const SidebarProjectSelect = () => {
  const router = useRouter()
  const { projects, currentProject, organizationSlug } = useProjectScope()

  const handleValueChange = (projectSlug: string) => {
    router.push(`/app/${organizationSlug}/${projectSlug}`)
  }

  return (
    <Select
      value={currentProject?.slug ?? ""}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select project" />
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
  )
}
