"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { ProgressStrip } from "@/components/ui/progress-strip/progress-strip"
import { UsageBreakdownCard } from "@/components/ui/usage-metric/usage-breakdown-card"
import { UsageBreakdownCardContent } from "@/components/ui/usage-metric/usage-breakdown-card-content"
import { UsageBreakdownCardDescription } from "@/components/ui/usage-metric/usage-breakdown-card-description"
import { UsageBreakdownCardHeader } from "@/components/ui/usage-metric/usage-breakdown-card-header"
import { UsageBreakdownCardMetric } from "@/components/ui/usage-metric/usage-breakdown-card-metric"
import { UsageBreakdownCardTitle } from "@/components/ui/usage-metric/usage-breakdown-card-title"
import { formatCostUsd } from "@/components/ui/usage-metric/format-cost-usd"
import { formatTokenCount } from "@/components/ui/usage-metric/format-token-count"
import { RecordFilePanel } from "@/features/files/components/record-file-panel"
import { RecordRelationsSection } from "@/features/record-edges/components/record-relations-section"
import { RecordConfiguration } from "@/features/records/components/record-configuration"
import { RecordDetailsHeader } from "@/features/records/components/record-details-header"
import { RecordLinkedTasksSection } from "@/features/records/components/record-linked-tasks-section"
import { RecordPrimarySection } from "@/features/records/components/record-primary-section"
import { useTRPC } from "@/lib/trpc/client"
import { formatDurationMs } from "@/utils/format-duration-ms"

type RecordDetailsPageProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const RecordDetailsPage = ({
  organizationSlug,
  projectSlug,
  recordId,
}: RecordDetailsPageProps) => {
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const recordQuery = useQuery({
    ...trpc.records.getById.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
    refetchInterval: (query) => {
      const record = query.state.data
      return record && record.progress.inProgressCount > 0 ? 3000 : false
    },
  })
  const recordSchemaQuery = useQuery({
    ...trpc.projectSchema.getByVersion.queryOptions({
      organizationSlug,
      projectSlug,
      version: recordQuery.data?.schemaVersion ?? 1,
    }),
    enabled: recordQuery.data !== undefined,
  })

  const deleteMutation = useMutation(
    trpc.records.remove.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
        router.push(`/app/${organizationSlug}/${projectSlug}/records`)
      },
    }),
  )

  const activateMutation = useMutation(
    trpc.records.activate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.getById.queryFilter({
            organizationSlug,
            projectSlug,
            recordId,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
      },
    }),
  )

  const deactivateMutation = useMutation(
    trpc.records.deactivate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.getById.queryFilter({
            organizationSlug,
            projectSlug,
            recordId,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
      },
    }),
  )

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      recordId,
    })
  }

  const handleActivate = async () => {
    await activateMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      recordId,
    })
  }

  const handleDeactivate = async () => {
    await deactivateMutation.mutateAsync({
      organizationSlug,
      projectSlug,
      recordId,
    })
  }

  const handleActiveToggle = (checked: boolean) => {
    if (checked) {
      handleActivate()
    } else {
      handleDeactivate()
    }
  }

  const isTogglePending =
    activateMutation.isPending || deactivateMutation.isPending

  const nextWaitingSortOrder =
    recordQuery.data?.linkedTasks
      .filter((t) => t.state === "waiting")
      .map((t) => t.sortOrder)
      .sort((a, b) => a - b)[0] ?? null

  if (recordQuery.isLoading || recordSchemaQuery.isLoading) {
    return <LoadingState label="Loading record..." />
  }

  if (!recordQuery.data || !recordSchemaQuery.data) {
    return <LoadingState label="Record details could not be loaded." />
  }

  const hasActiveTasks = recordQuery.data.progress.inProgressCount > 0

  return (
    <div className="flex flex-col gap-6">
      <RecordDetailsHeader
        activeRunState={recordQuery.data.activeRunSummary?.state ?? null}
        activeRunTooltipText={
          recordQuery.data.activeRunSummary?.statusTooltipText ?? null
        }
        deleteDisabled={hasActiveTasks}
        deletePending={deleteMutation.isPending}
        isTogglePending={isTogglePending}
        name={recordQuery.data.name}
        onActiveToggle={handleActiveToggle}
        onDeleteRecord={() => setShowDeleteDialog(true)}
        state={recordQuery.data.state}
      />
      <ProgressStrip
        items={[
          { label: "Waiting", value: recordQuery.data.progress.waitingCount },
          { label: "Active", value: recordQuery.data.progress.inProgressCount },
          {
            label: "Completed",
            value: recordQuery.data.progress.completedCount,
          },
          { label: "Failed", value: recordQuery.data.progress.failedCount },
          { label: "Skipped", value: recordQuery.data.progress.skippedCount },
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <RecordPrimarySection
          context={recordQuery.data.context}
          name={recordQuery.data.name}
          recordId={recordQuery.data.id}
          schemaDefinition={recordSchemaQuery.data.schemaDefinition}
          version={recordQuery.data.version}
        />
        <RecordConfiguration
          context={recordQuery.data.context}
          createdAt={recordQuery.data.createdAt}
          schemaVersion={recordQuery.data.schemaVersion}
          updatedAt={recordQuery.data.updatedAt}
          version={recordQuery.data.version}
        />
      </div>
      <UsageBreakdownCard>
        <UsageBreakdownCardHeader>
          <UsageBreakdownCardTitle>Usage</UsageBreakdownCardTitle>
          <UsageBreakdownCardDescription>
            Costs and tokens across all intern run attempts.
          </UsageBreakdownCardDescription>
        </UsageBreakdownCardHeader>
        <UsageBreakdownCardContent>
          <UsageBreakdownCardMetric
            label="Total cost"
            value={formatCostUsd(recordQuery.data.usage.totalCostUsd)}
          />
          <UsageBreakdownCardMetric
            label="Total time"
            value={formatDurationMs(recordQuery.data.usage.totalDurationMs)}
          />
          <UsageBreakdownCardMetric
            label="Total tokens"
            value={formatTokenCount(recordQuery.data.usage.totalTokens)}
          />
          <UsageBreakdownCardMetric
            label="Input"
            value={formatTokenCount(recordQuery.data.usage.totalInputTokens)}
          />
          <UsageBreakdownCardMetric
            label="Output"
            value={formatTokenCount(recordQuery.data.usage.totalOutputTokens)}
          />
          <UsageBreakdownCardMetric
            label="Cached input"
            value={formatTokenCount(recordQuery.data.usage.totalCachedInputTokens)}
          />
          <UsageBreakdownCardMetric
            label="Cache write"
            value={formatTokenCount(recordQuery.data.usage.totalCacheWriteTokens)}
          />
          <UsageBreakdownCardMetric
            label="Runs"
            value={formatTokenCount(recordQuery.data.usage.runCount)}
          />
          <UsageBreakdownCardMetric
            label="Average cost"
            value={
              recordQuery.data.usage.averageCostUsd === null
                ? "—"
                : formatCostUsd(recordQuery.data.usage.averageCostUsd)
            }
          />
        </UsageBreakdownCardContent>
      </UsageBreakdownCard>
      <RecordLinkedTasksSection
        nextWaitingSortOrder={nextWaitingSortOrder}
        recordId={recordQuery.data.id}
        tasks={recordQuery.data.linkedTasks}
      />
      <RecordFilePanel
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordQuery.data.id}
      />
      <RecordRelationsSection
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordQuery.data.id}
      />
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete record</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{recordQuery.data.name}&quot;
              and all linked work records, relations, artifacts, and activity
              logs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
