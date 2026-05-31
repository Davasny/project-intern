"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type ProjectDeleteSectionProps = {
  displayName: string
}

export const ProjectDeleteSection = ({
  displayName,
}: ProjectDeleteSectionProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()

  const deleteProjectMutation = useMutation(
    trpc.projects.remove.mutationOptions({
      onSuccess: async (project) => {
        toast.success(`Project "${project.displayName}" deleted.`)
        await queryClient.invalidateQueries(
          trpc.projects.listForOrganization.queryFilter({ organizationSlug }),
        )
        setIsDeleteDialogOpen(false)
        router.replace(`/app/${organizationSlug}/projects`)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }),
  )

  const handleDelete = async () => {
    await deleteProjectMutation.mutateAsync({
      organizationSlug,
      projectSlug,
    })
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Permanently delete this project, including its tasks, records, schema
          versions, artifacts, workspace, and skills files.
        </p>
        <div className="flex flex-row justify-end">
          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            type="button"
            variant="destructive"
          >
            Delete project
          </Button>
        </div>
      </div>
      <Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              "{displayName}" will be permanently deleted. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row justify-end gap-2">
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteProjectMutation.isPending}
              isLoading={deleteProjectMutation.isPending}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
