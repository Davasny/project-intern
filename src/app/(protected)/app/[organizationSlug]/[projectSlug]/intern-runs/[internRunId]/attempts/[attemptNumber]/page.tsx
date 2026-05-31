import { notFound } from "next/navigation"
import { InternRunDetailsPage } from "@/features/intern-runs/components/intern-run-details-page"

type PageProps = {
  params: Promise<{
    attemptNumber: string
    internRunId: string
  }>
}

const ProjectInternRunAttemptDetailsPage = async ({ params }: PageProps) => {
  const { attemptNumber, internRunId } = await params
  const parsedAttemptNumber = Number(attemptNumber)

  if (!Number.isInteger(parsedAttemptNumber) || parsedAttemptNumber < 1) {
    notFound()
  }

  return (
    <InternRunDetailsPage
      anchorInternRunId={internRunId}
      attemptNumber={parsedAttemptNumber}
    />
  )
}

export default ProjectInternRunAttemptDetailsPage
