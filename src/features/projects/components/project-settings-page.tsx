"use client"

import { useQuery } from "@tanstack/react-query"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { ProjectSettingsForm } from "@/features/projects/components/project-settings-form"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const ProjectSettingsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const settingsQuery = useQuery(
    trpc.projects.getSettings.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  if (settingsQuery.isLoading) {
    return <LoadingState label="Loading project settings..." />
  }

  if (!settingsQuery.data) {
    return <LoadingState label="Project settings could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Project settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure default model and other project-wide settings.
          </p>
        </div>
      </PageHeader>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Default model
          </h2>
          <p className="text-sm text-muted-foreground">
            Tasks without an explicit model override will use this model.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          <ProjectSettingsForm
            approvedModels={settingsQuery.data.approvedModels}
            initialDefaultModel={settingsQuery.data.defaultModel}
          />
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
