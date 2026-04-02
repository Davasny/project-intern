"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Textarea } from "@/components/ui/textarea"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

const taskFormSchema = z.object({
  descriptionMarkdown: z
    .string()
    .trim()
    .min(1, "Task description is required."),
  model: z.string().trim(),
  pipelineVersion: z.string().trim(),
  schemaVersion: z.number().int().min(1),
  title: z.string().trim().min(1, "Task title is required."),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

type TaskFormProps = {
  initialDescriptionMarkdown: string
  initialModel: string | null
  initialPipelineVersion: string | null
  initialSchemaVersion: number
  initialTitle: string
  onSubmitted: () => void
  schemaVersionOptions: number[]
  taskId: string | null
}

export const TaskForm = ({
  initialDescriptionMarkdown,
  initialModel,
  initialPipelineVersion,
  initialSchemaVersion,
  initialTitle,
  onSubmitted,
  schemaVersionOptions,
  taskId,
}: TaskFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<TaskFormValues>({
    defaultValues: {
      descriptionMarkdown: initialDescriptionMarkdown,
      model: initialModel ?? "",
      pipelineVersion: initialPipelineVersion ?? "",
      schemaVersion: initialSchemaVersion,
      title: initialTitle,
    },
    resolver: zodResolver(taskFormSchema),
  })

  const createTaskMutation = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.projects.overview.queryFilter({ organizationSlug, projectSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
        form.reset({
          descriptionMarkdown: "",
          model: "",
          pipelineVersion: "",
          schemaVersion: initialSchemaVersion,
          title: "",
        })
      },
    }),
  )

  const updateTaskMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: async (task) => {
        await queryClient.invalidateQueries(
          trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.tasks.getById.queryFilter({
            organizationSlug,
            projectSlug,
            taskId: task.id,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.projects.overview.queryFilter({ organizationSlug, projectSlug }),
        )
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    const model = values.model.length > 0 ? values.model : null
    const pipelineVersion =
      values.pipelineVersion.length > 0 ? values.pipelineVersion : null

    if (taskId) {
      await updateTaskMutation.mutateAsync({
        input: {
          descriptionMarkdown: values.descriptionMarkdown,
          model,
          pipelineVersion,
          schemaVersion: values.schemaVersion,
          taskId,
          title: values.title,
        },
        organizationSlug,
        projectSlug,
      })
      onSubmitted()
      return
    }

    await createTaskMutation.mutateAsync({
      input: {
        descriptionMarkdown: values.descriptionMarkdown,
        model,
        pipelineVersion,
        schemaVersion: values.schemaVersion,
        title: values.title,
      },
      organizationSlug,
      projectSlug,
    })
    onSubmitted()
  })

  const submitLabel = taskId
    ? updateTaskMutation.isPending
      ? "Saving task..."
      : "Save task"
    : createTaskMutation.isPending
      ? "Creating task..."
      : "Create task"

  return (
    <Form {...form}>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task title</FormLabel>
              <FormControl>
                <Input placeholder="Research company website" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="descriptionMarkdown"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-48"
                  placeholder="# Goal"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Markdown is stored canonically and description changes append
                revisions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="schemaVersion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schema version</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    onChange={(event) =>
                      field.onChange(Number(event.target.value))
                    }
                    value={field.value}
                  >
                    {schemaVersionOptions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model override</FormLabel>
                <FormControl>
                  <Input placeholder="openai/gpt-5.4" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pipelineVersion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pipeline version</FormLabel>
                <FormControl>
                  <Input placeholder="future-file-pipeline-v1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          disabled={
            createTaskMutation.isPending || updateTaskMutation.isPending
          }
          type="submit"
        >
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
