"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
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
import { useTRPC } from "@/lib/trpc/client"

const projectCreateFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters."),
})

type ProjectCreateFormProps = {
  organizationSlug: string
}

type ProjectCreateFormValues = z.infer<typeof projectCreateFormSchema>

export const ProjectCreateForm = ({
  organizationSlug,
}: ProjectCreateFormProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const form = useForm<ProjectCreateFormValues>({
    defaultValues: {
      displayName: "",
    },
    resolver: zodResolver(projectCreateFormSchema),
  })

  const createProjectMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: async (project) => {
        await queryClient.invalidateQueries(
          trpc.projects.listForOrganization.queryFilter({ organizationSlug }),
        )
        router.push(`/app/${organizationSlug}/${project.slug}`)
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    await createProjectMutation.mutateAsync({
      displayName: values.displayName,
      organizationSlug,
    })
    form.reset({
      displayName: "",
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
                Slug is generated from the project name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={createProjectMutation.isPending} type="submit">
          {createProjectMutation.isPending
            ? "Creating project..."
            : "Create project"}
        </Button>
      </form>
    </Form>
  )
}
