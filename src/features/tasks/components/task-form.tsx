"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
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
  temperature: z.string().trim(),
  schemaVersion: z.number().int().min(1),
  title: z.string().trim().min(1, "Task title is required."),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

type TaskFormProps = {
  initialDescriptionMarkdown: string
  initialModel: string | null
  initialTemperature: number | null
  initialSchemaVersion: number
  initialTitle: string
  onSubmitted: () => void
  schemaVersionOptions: number[]
  taskId: string | null
}

const temperatureOptions = Array.from({ length: 11 }, (_, index) =>
  (index / 10).toFixed(1),
)

export const TaskForm = ({
  initialDescriptionMarkdown,
  initialModel,
  initialTemperature,
  initialSchemaVersion,
  initialTitle,
  onSubmitted,
  schemaVersionOptions,
  taskId,
}: TaskFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [createIntent, setCreateIntent] = useState<
    "create_draft" | "create_draft_and_accept"
  >("create_draft_and_accept")
  const form = useForm<TaskFormValues>({
    defaultValues: {
      descriptionMarkdown: initialDescriptionMarkdown,
      model: initialModel ?? "",
      temperature:
        initialTemperature === null ? "" : initialTemperature.toFixed(1),
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
          temperature: "",
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
    const temperature =
      values.temperature.length > 0 ? Number(values.temperature) : null

    if (taskId) {
      await updateTaskMutation.mutateAsync({
        input: {
          descriptionMarkdown: values.descriptionMarkdown,
          model,
          schemaVersion: values.schemaVersion,
          taskId,
          temperature,
          title: values.title,
        },
        organizationSlug,
        projectSlug,
      })
      onSubmitted()
      return
    }

    await createTaskMutation.mutateAsync({
      intent: createIntent,
      input: {
        descriptionMarkdown: values.descriptionMarkdown,
        model,
        schemaVersion: values.schemaVersion,
        temperature,
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
    : createIntent === "create_draft"
      ? createTaskMutation.isPending
        ? "Saving draft..."
        : "Save as draft"
      : createTaskMutation.isPending
        ? "Saving task..."
        : "Save"

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
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="schemaVersion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schema version</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature override</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    onChange={(event) => field.onChange(event.target.value)}
                    value={field.value}
                  >
                    <option value="">Use project default</option>
                    {temperatureOptions.map((temperature) => (
                      <option key={temperature} value={temperature}>
                        {temperature}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {taskId ? (
          <Button
            disabled={
              createTaskMutation.isPending || updateTaskMutation.isPending
            }
            type="submit"
          >
            {submitLabel}
          </Button>
        ) : (
          <div className="flex flex-row gap-2">
            <Button
              disabled={
                createTaskMutation.isPending || updateTaskMutation.isPending
              }
              onClick={() => setCreateIntent("create_draft")}
              type="submit"
              variant="outline"
            >
              {createTaskMutation.isPending && createIntent === "create_draft"
                ? "Saving draft..."
                : "Save as draft"}
            </Button>
            <Button
              disabled={
                createTaskMutation.isPending || updateTaskMutation.isPending
              }
              onClick={() => setCreateIntent("create_draft_and_accept")}
              type="submit"
            >
              {createTaskMutation.isPending &&
              createIntent === "create_draft_and_accept"
                ? "Saving task..."
                : "Save"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
