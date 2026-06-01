"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

const projectDescriptionFormSchema = z.object({
  descriptionMarkdown: z.string(),
})

type ProjectDescriptionFormValues = z.infer<typeof projectDescriptionFormSchema>

type ProjectDescriptionFormProps = {
  initialDescriptionMarkdown: string
  onSubmitted: () => void
}

export const ProjectDescriptionForm = ({
  initialDescriptionMarkdown,
  onSubmitted,
}: ProjectDescriptionFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<ProjectDescriptionFormValues>({
    defaultValues: {
      descriptionMarkdown: initialDescriptionMarkdown,
    },
    resolver: zodResolver(projectDescriptionFormSchema),
  })

  const updateDescriptionMutation = useMutation(
    trpc.projects.updateDescription.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.projects.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.execution.getMonitor.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    await updateDescriptionMutation.mutateAsync({
      input: {
        descriptionMarkdown: values.descriptionMarkdown,
      },
      organizationSlug,
      projectSlug,
    })
    onSubmitted()
  })

  const submitLabel = updateDescriptionMutation.isPending
    ? "Saving..."
    : "Save description"

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="descriptionMarkdown"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project description</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-40"
                  placeholder="Describe the project goal, data shape, domain assumptions, and success criteria interns should keep in mind."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button disabled={updateDescriptionMutation.isPending} type="submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
