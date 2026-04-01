"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { OrganizationSelectionList } from "@/features/organizations/components/organization-selection-list"
import { ProjectCreateForm } from "@/features/projects/components/project-create-form"
import { ProjectSelectionList } from "@/features/projects/components/project-selection-list"
import { useTRPC } from "@/lib/trpc/client"

export const ProjectSelectionFlow = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const trpc = useTRPC()
  const organizationsQuery = useQuery(
    trpc.organizations.listMine.queryOptions(),
  )

  const organizations = organizationsQuery.data ?? []
  const selectedOrganizationSlug =
    searchParams.get("organization") ?? organizations[0]?.slug ?? ""

  const projectsQuery = useQuery(
    trpc.projects.listForOrganization.queryOptions(
      { organizationSlug: selectedOrganizationSlug },
      { enabled: selectedOrganizationSlug.length > 0 },
    ),
  )

  const handleOrganizationSelect = (organizationSlug: string) => {
    router.replace(`/app/select?organization=${organizationSlug}`)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Organizations</h2>
            <p className="text-sm text-slate-600">
              Your memberships define which projects you can open.
            </p>
          </div>
          <OrganizationSelectionList
            onSelect={handleOrganizationSelect}
            organizations={organizations}
            selectedOrganizationSlug={selectedOrganizationSlug}
          />
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Projects</h2>
            <p className="text-sm text-slate-600">
              Create your first project or reopen an existing scope.
            </p>
          </div>
          {selectedOrganizationSlug.length > 0 ? (
            <>
              <ProjectCreateForm organizationSlug={selectedOrganizationSlug} />
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  Existing projects
                </h3>
                <ProjectSelectionList
                  organizationSlug={selectedOrganizationSlug}
                  projects={projectsQuery.data ?? []}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Bootstrap will create a personal organization on first login.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
