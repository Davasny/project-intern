"use client"

import { useQuery } from "@tanstack/react-query"
import { use } from "react"
import { Card } from "@/components/ui/card"
import { ProjectCreateForm } from "@/features/projects/components/project-create-form"
import { ProjectSelectionList } from "@/features/projects/components/project-selection-list"
import { useTRPC } from "@/lib/trpc/client"

type ProjectsPageProps = {
  params: Promise<{ organizationSlug: string }>
}

const ProjectsPage = ({ params }: ProjectsPageProps) => {
  const { organizationSlug } = use(params)
  const trpc = useTRPC()

  const organizationsQuery = useQuery(
    trpc.organizations.listMine.queryOptions(),
  )
  const projectsQuery = useQuery(
    trpc.projects.listForOrganization.queryOptions({ organizationSlug }),
  )

  const organizations = organizationsQuery.data ?? []
  const currentOrganization = organizations.find(
    (org) => org.slug === organizationSlug,
  )
  const projects = projectsQuery.data ?? []

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {currentOrganization?.name ?? "Projects"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Create your first project or reopen an existing scope.
        </p>
      </div>
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          <ProjectCreateForm organizationSlug={organizationSlug} />
          {projects.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Existing projects
              </h2>
              <ProjectSelectionList
                organizationSlug={organizationSlug}
                projects={projects}
              />
            </div>
          )}
        </div>
      </Card>
    </main>
  )
}

export default ProjectsPage
