"use client"

import { useQuery } from "@tanstack/react-query"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { ImportExportSection } from "@/features/projects/components/import-export-section"
import { ProjectDescriptionForm } from "@/features/projects/components/project-description-form"
import { ProjectDeleteSection } from "@/features/projects/components/project-delete-section"
import { ProjectRenameForm } from "@/features/projects/components/project-rename-form"
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
        </div>
      </PageHeader>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">Project</h2>
        </SectionCardHeader>
        <SectionCardContent>
          <div className="flex flex-col gap-6">
            <ProjectRenameForm initialDisplayName={settingsQuery.data.displayName} />
            <ProjectDescriptionForm
              initialDescriptionMarkdown={settingsQuery.data.descriptionMarkdown}
              onSubmitted={() => undefined}
            />
          </div>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Runtime
          </h2>
        </SectionCardHeader>
        <SectionCardContent>
          <ProjectSettingsForm
            approvedModels={settingsQuery.data.approvedModels}
            debugControlsEnabled={settingsQuery.data.debugControlsEnabled}
            initialInternPythonRequirements={
              settingsQuery.data.internPythonRequirements
            }
            initialDefaultModel={settingsQuery.data.defaultModel}
            initialDefaultTemperature={settingsQuery.data.defaultTemperature}
            initialIsAutopickEnabled={settingsQuery.data.isAutopickEnabled}
          />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Import / Export
          </h2>
        </SectionCardHeader>
        <SectionCardContent>
          <ImportExportSection />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-destructive">
            Danger zone
          </h2>
        </SectionCardHeader>
        <SectionCardContent>
          <ProjectDeleteSection displayName={settingsQuery.data.displayName} />
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
