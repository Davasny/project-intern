import { Button } from "@/components/ui/button"

type InternRunOpencodeExportButtonProps = {
  internRunId: string
  organizationSlug: string
  projectSlug: string
  sessionReference: string | null
}

export const InternRunOpencodeExportButton = ({
  internRunId,
  organizationSlug,
  projectSlug,
  sessionReference,
}: InternRunOpencodeExportButtonProps) => {
  if (!sessionReference) {
    return (
      <Button
        disabled
        title="This run does not have an OpenCode session reference."
        type="button"
        variant="secondary"
      >
        Export transcript
      </Button>
    )
  }

  const query = new URLSearchParams({
    organizationSlug,
    projectSlug,
  })
  const href = `/api/intern-runs/${internRunId}/opencode-export?${query.toString()}`

  return (
    <Button asChild variant="secondary">
      <a download={`${sessionReference}.json`} href={href}>
        Export transcript
      </a>
    </Button>
  )
}
