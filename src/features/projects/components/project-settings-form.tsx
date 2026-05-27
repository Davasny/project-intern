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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

const projectSettingsFormSchema = z.object({
  defaultModel: z.string().trim().min(1, "Default model is required."),
  defaultTemperature: z.string().trim().min(1, "Default temperature is required."),
})

type ProjectSettingsFormValues = z.infer<typeof projectSettingsFormSchema>

type ProjectSettingsFormProps = {
  approvedModels: string[]
  initialDefaultModel: string
  initialDefaultTemperature: number
}

const temperatureOptions = Array.from({ length: 11 }, (_, index) =>
  (index / 10).toFixed(1),
)

export const ProjectSettingsForm = ({
  approvedModels,
  initialDefaultModel,
  initialDefaultTemperature,
}: ProjectSettingsFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<ProjectSettingsFormValues>({
    defaultValues: {
      defaultModel: initialDefaultModel,
      defaultTemperature: initialDefaultTemperature.toFixed(1),
    },
    resolver: zodResolver(projectSettingsFormSchema),
  })

  const updateSettingsMutation = useMutation(
    trpc.projects.updateSettings.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.projects.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    await updateSettingsMutation.mutateAsync({
      input: {
        defaultModel: values.defaultModel,
        defaultTemperature: Number(values.defaultTemperature),
      },
      organizationSlug,
      projectSlug,
    })
  })

  const submitLabel = updateSettingsMutation.isPending
    ? "Saving..."
    : "Save settings"

  return (
    <Form {...form}>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="defaultModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default model</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {approvedModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                This model will be used by all tasks that do not specify an
                override.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultTemperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default temperature</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select temperature" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {temperatureOptions.map((temperature) => (
                    <SelectItem key={temperature} value={temperature}>
                      {temperature}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Default sampling temperature used when tasks do not specify an
                override.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={updateSettingsMutation.isPending} type="submit">
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
