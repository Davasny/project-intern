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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

const projectSettingsFormSchema = z.object({
  internPythonRequirements: z.string(),
  defaultModel: z.string().trim().min(1, "Default model is required."),
  defaultTemperature: z.string().trim().min(1, "Default temperature is required."),
  isAutopickEnabled: z.boolean(),
})

type ProjectSettingsFormValues = z.infer<typeof projectSettingsFormSchema>

type ProjectSettingsFormProps = {
  approvedModels: string[]
  debugControlsEnabled: boolean
  initialInternPythonRequirements: string
  initialDefaultModel: string
  initialDefaultTemperature: number
  initialIsAutopickEnabled: boolean
}

const temperatureOptions = Array.from({ length: 11 }, (_, index) =>
  (index / 10).toFixed(1),
)

export const ProjectSettingsForm = ({
  approvedModels,
  debugControlsEnabled,
  initialInternPythonRequirements,
  initialDefaultModel,
  initialDefaultTemperature,
  initialIsAutopickEnabled,
}: ProjectSettingsFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<ProjectSettingsFormValues>({
    defaultValues: {
      internPythonRequirements: initialInternPythonRequirements,
      defaultModel: initialDefaultModel,
      defaultTemperature: initialDefaultTemperature.toFixed(1),
      isAutopickEnabled: initialIsAutopickEnabled,
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
    await updateSettingsMutation.mutateAsync({
      input: {
        internPythonRequirements: values.internPythonRequirements,
        defaultModel: values.defaultModel,
        defaultTemperature: Number(values.defaultTemperature),
        isAutopickEnabled: values.isAutopickEnabled,
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
              <FormDescription>Used when a task has no override.</FormDescription>
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
              <FormDescription>Used when a task has no override.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {debugControlsEnabled ? (
          <FormField
            control={form.control}
            name="isAutopickEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-1">
                  <FormLabel>Autopick</FormLabel>
                  <FormDescription>
                    Automatically claim waiting work records.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="internPythonRequirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intern Python requirements</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-48 font-mono"
                  placeholder={"requests==2.32.5\npandas==2.3.3"}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Written to requirements-intern.txt and installed into the project
                venv before agents run.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button disabled={updateSettingsMutation.isPending} type="submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
