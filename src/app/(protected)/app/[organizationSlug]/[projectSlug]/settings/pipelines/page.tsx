import { PipelineSettingsPage } from "@/features/pipelines/components/pipeline-settings-page"

const ProjectPipelineSettingsPage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <PipelineSettingsPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default ProjectPipelineSettingsPage
