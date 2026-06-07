import { TRPCError } from "@trpc/server"
import { getInternRunById } from "@/features/intern-runs/lib/get-intern-run-by-id"
import { syncInternRunMetricsFromSession } from "@/features/intern-runs/lib/sync-intern-run-metrics-from-session"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"

export const refreshInternRunStats = async ({
  internRunId,
  organizationSlug,
  projectSlug,
  userId,
}: {
  internRunId: string
  organizationSlug: string
  projectSlug: string
  userId: string
}) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const run = await getInternRunById({
    internRunId,
    organizationSlug,
    projectSlug,
    userId,
  })

  if (run.sessionReference === null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Intern run has no OpenCode session reference.",
    })
  }

  const syncResult = await syncInternRunMetricsFromSession({
    internRunId,
    organizationId: project.organizationId,
    projectId: project.id,
  })

  return {
    success: syncResult?.synced ?? false,
    reason: syncResult?.reason ?? "no_metrics",
  }
}
