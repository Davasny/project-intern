import { RecordsPage } from "@/features/records/components/records-page"

const RecordsRoutePage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <RecordsPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  )
}

export default RecordsRoutePage
