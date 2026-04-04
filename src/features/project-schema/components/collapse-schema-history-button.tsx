"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type CollapseSchemaHistoryButtonProps = {
  totalRecordCount: number
  versionCount: number
}

export const CollapseSchemaHistoryButton = ({
  totalRecordCount,
  versionCount,
}: CollapseSchemaHistoryButtonProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const collapseMutation = useMutation(
    trpc.projectSchema.collapseToSingleVersion.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.projectSchema.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
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
          trpc.projectSchema.listProposals.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.tasks.list.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
        setIsOpen(false)
      },
    }),
  )

  const handleConfirm = async () => {
    await collapseMutation.mutateAsync({
      organizationSlug,
      projectSlug,
    })
  }

  const isDisabled = totalRecordCount > 0 || versionCount <= 1
  const disabledReason =
    totalRecordCount > 0
      ? "Schema merge is availble only in projects with no records."
      : versionCount <= 1
        ? "Schema history is already a single version."
        : undefined

  const trigger = (
    <Button disabled={isDisabled} type="button" variant="destructive">
      Merge to single v1
    </Button>
  )

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        {isDisabled ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="inline-flex">{trigger}</div>
            </TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge schema history to single v1</DialogTitle>
          <DialogDescription>
            {disabledReason ??
              `This will keep the current active schema and relabel it as v1. All other schema versions and related migration tasks will be deleted. This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            disabled={collapseMutation.isPending}
            onClick={handleConfirm}
            type="button"
            variant="destructive"
          >
            {collapseMutation.isPending ? "Merging..." : "Merge to single v1"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
