"use client"

import { useRouter } from "next/navigation"

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
    <select
      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-900"
      value={currentProjectSlug}
      onChange={(e) => {
        router.push(`/app/${organizationSlug}/${e.target.value}`)
      }}
    >
      {projects.map((project) => (
        <option key={project.id} value={project.slug}>
          {project.displayName}
        </option>
      ))}
    </select>
  )
}
