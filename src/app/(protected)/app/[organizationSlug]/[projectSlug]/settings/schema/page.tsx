import { SchemaVersionBrowser } from "@/features/project-schema/components/schema-version-browser"

const ProjectSchemaSettingsPage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <SchemaVersionBrowser
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default ProjectSchemaSettingsPage
