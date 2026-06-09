import { TRPCError } from "@trpc/server"
import { getInternRunById } from "@/features/intern-runs/lib/get-intern-run-by-id"

type GetInternRunOpencodeExportTargetParams = {
  internRunId: string
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getInternRunOpencodeExportTarget = async ({
  internRunId,
  organizationSlug,
  projectSlug,
  userId,
}: GetInternRunOpencodeExportTargetParams) => {
  const run = await getInternRunById({
    internRunId,
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!run.sessionReference) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Intern run does not have an OpenCode session reference.",
    })
  }

  return {
    directory: run.directory,
    internRunId: run.id,
    sessionReference: run.sessionReference,
  }
}
