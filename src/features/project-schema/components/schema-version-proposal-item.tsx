"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type SchemaVersionProposalItemProps = {
  onCompare: () => void
  proposal: {
    createdAt: Date
    id: string
    state: "accepted" | "created" | "rejected"
    version: number
  }
}

export const SchemaVersionProposalItem = ({
  onCompare,
  proposal,
}: SchemaVersionProposalItemProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const invalidateSchemaQueries = async () => {
    await queryClient.invalidateQueries(
      trpc.projectSchema.getActive.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.projectSchema.listVersions.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.projectSchema.getSettings.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
    await queryClient.invalidateQueries(
      trpc.projectSchema.listProposals.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
  }

  const acceptProposalMutation = useMutation(
    trpc.projectSchema.acceptProposal.mutationOptions({
      onSuccess: invalidateSchemaQueries,
    }),
  )

  const rejectProposalMutation = useMutation(
    trpc.projectSchema.rejectProposal.mutationOptions({
      onSuccess: invalidateSchemaQueries,
    }),
  )

  const isPending =
    acceptProposalMutation.isPending || rejectProposalMutation.isPending
  const isCreatedState = proposal.state === "created"

  const handleAccept = async () => {
    await acceptProposalMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      schemaVersionId: proposal.id,
    })
  }

  const handleReject = async () => {
    await rejectProposalMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      schemaVersionId: proposal.id,
    })
  }

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Proposal v{proposal.version}
          </span>
          <StatusBadge label={proposal.state} tone="warning" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{proposal.createdAt.toLocaleString()}</span>
        </div>
      </div>
      <Button onClick={onCompare} size="sm" type="button" variant="ghost">
        Compare
      </Button>
      <Button
        disabled={isPending || !isCreatedState}
        onClick={handleReject}
        size="sm"
        type="button"
        variant="outline"
      >
        Reject
      </Button>
      <Button
        disabled={isPending || !isCreatedState}
        onClick={handleAccept}
        size="sm"
        type="button"
      >
        Accept
      </Button>
    </div>
  )
}
