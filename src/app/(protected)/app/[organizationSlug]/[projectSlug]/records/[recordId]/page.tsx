import { RecordDetailsPage } from "@/features/records/components/record-details-page"

const RecordRoutePage = async ({
  params,
}: {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
    recordId: string
  }>
}) => {
  const { organizationSlug, projectSlug, recordId } = await params

  return (
    <RecordDetailsPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      recordId={recordId}
    />
  )
}

export default RecordRoutePage
