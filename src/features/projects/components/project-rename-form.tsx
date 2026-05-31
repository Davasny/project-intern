"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

const projectRenameFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters."),
})

type ProjectRenameFormProps = {
  initialDisplayName: string
}

type ProjectRenameFormValues = z.infer<typeof projectRenameFormSchema>

export const ProjectRenameForm = ({
  initialDisplayName,
}: ProjectRenameFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const form = useForm<ProjectRenameFormValues>({
    defaultValues: {
      displayName: initialDisplayName,
    },
    resolver: zodResolver(projectRenameFormSchema),
  })

  const renameProjectMutation = useMutation(
    trpc.projects.rename.mutationOptions({
      onSuccess: async (project) => {
        toast.success(`Project renamed to "${project.displayName}"`)
        router.replace(`/app/${organizationSlug}/${project.slug}/settings`)
        await queryClient.invalidateQueries(
          trpc.projects.listForOrganization.queryFilter({ organizationSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.projects.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    await renameProjectMutation.mutateAsync({
      displayName: values.displayName,
      organizationSlug,
      projectSlug,
    })
  })

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project name</FormLabel>
              <FormControl>
                <Input placeholder="Customer onboarding" {...field} />
              </FormControl>
              <FormDescription>
                Renaming the project also updates its URL slug.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-row justify-end">
          <Button
            disabled={renameProjectMutation.isPending}
            isLoading={renameProjectMutation.isPending}
            type="submit"
          >
            Save name
          </Button>
        </div>
      </form>
    </Form>
  )
}
