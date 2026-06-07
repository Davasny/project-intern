import { useMutation, useQueryClient } from "@tanstack/react-query"
import { RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTRPC } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

type InternRunRefreshStatsButtonProps = {
  attemptNumber: number
  internRunId: string
  organizationSlug: string
  projectSlug: string
  queryInternRunId: string
}

export const InternRunRefreshStatsButton = ({
  attemptNumber,
  internRunId,
  organizationSlug,
  projectSlug,
  queryInternRunId,
}: InternRunRefreshStatsButtonProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const refreshMutation = useMutation(
    trpc.internRuns.refreshRunStats.mutationOptions(),
  )

  const handleRefresh = async () => {
    try {
      const result = await refreshMutation.mutateAsync({
        internRunId,
        organizationSlug,
        projectSlug,
      })

      await queryClient.invalidateQueries(
        trpc.internRuns.getAttempt.queryFilter({
          attemptNumber,
          internRunId: queryInternRunId,
          organizationSlug,
          projectSlug,
        }),
      )

      if (result.success) {
        toast.success("Run stats synced.")
        return
      }

      toast.info(`Run stats not updated: ${result.reason}.`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to sync run stats.",
      )
    }
  }

  return (
    <Button
      disabled={refreshMutation.isPending}
      onClick={handleRefresh}
      size="icon"
      type="button"
      variant="outline"
    >
      <RefreshCwIcon
        className={cn(
          "size-4",
          refreshMutation.isPending ? "animate-spin" : "",
        )}
      />
      <span className="sr-only">Refresh run stats</span>
    </Button>
  )
}
