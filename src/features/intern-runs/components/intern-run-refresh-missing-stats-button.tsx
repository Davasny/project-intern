import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTRPC } from "@/lib/trpc/client"

type InternRunRefreshMissingStatsButtonProps = {
  organizationSlug: string
  projectSlug: string
}

export const InternRunRefreshMissingStatsButton = ({
  organizationSlug,
  projectSlug,
}: InternRunRefreshMissingStatsButtonProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const refreshMutation = useMutation(
    trpc.internRuns.refreshMissingStats.mutationOptions(),
  )

  const handleRefresh = async () => {
    try {
      const result = await refreshMutation.mutateAsync({
        organizationSlug,
        projectSlug,
      })

      await queryClient.invalidateQueries(
        trpc.internRuns.list.queryFilter({
          organizationSlug,
          projectSlug,
        }),
      )

      toast.success(
        `Stats synced: ${String(result.updatedCount)} updated (${String(result.activeUpdatedCount)} active), ${String(result.skippedCount)} skipped, ${String(result.failedCount)} failed.`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to sync stats.",
      )
    }
  }

  return (
    <Button
      isLoading={refreshMutation.isPending}
      onClick={handleRefresh}
      type="button"
      variant="outline"
    >
      Sync stats
    </Button>
  )
}
