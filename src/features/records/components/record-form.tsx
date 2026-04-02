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
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { RecordContextFormField } from "@/features/records/components/record-context-form-field"
import { buildRecordContextPayload } from "@/features/records/lib/build-record-context-payload"
import { getRecordFormDefaultValues } from "@/features/records/lib/get-record-form-default-values"
import { useTRPC } from "@/lib/trpc/client"

const recordFormSchema = z.object({
  context: z.record(z.string(), z.unknown()),
  name: z.string().trim().min(1, "Record name is required."),
})

type RecordFormValues = z.infer<typeof recordFormSchema>

type RecordFormProps = {
  initialContext: Record<string, unknown>
  initialName: string
  onSubmitted: () => void
  organizationSlug: string
  projectSlug: string
  recordId: string | null
  recordVersion: number | null
  schemaDefinition: ProjectSchemaDefinition
}

export const RecordForm = ({
  initialContext,
  initialName,
  onSubmitted,
  organizationSlug,
  projectSlug,
  recordId,
  recordVersion,
  schemaDefinition,
}: RecordFormProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<RecordFormValues>({
    defaultValues: getRecordFormDefaultValues({
      context: initialContext,
      name: initialName,
      schemaDefinition,
    }),
    resolver: zodResolver(recordFormSchema),
  })

  const createRecordMutation = useMutation(
    trpc.records.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
        form.reset(
          getRecordFormDefaultValues({
            context: {},
            name: "",
            schemaDefinition,
          }),
        )
      },
    }),
  )

  const updateRecordMutation = useMutation(
    trpc.records.update.mutationOptions({
      onSuccess: async (record) => {
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.records.getById.queryFilter({
            organizationSlug,
            projectSlug,
            recordId: record.id,
          }),
        )
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    const context = buildRecordContextPayload({
      rawContext: values.context,
      schemaDefinition,
    })

    if (recordId && recordVersion) {
      await updateRecordMutation.mutateAsync({
        input: {
          context,
          name: values.name,
          recordId,
          version: recordVersion,
        },
        organizationSlug,
        projectSlug,
      })
      onSubmitted()
      return
    }

    await createRecordMutation.mutateAsync({
      input: {
        context,
        name: values.name,
      },
      organizationSlug,
      projectSlug,
    })
    onSubmitted()
  })

  const submitLabel = recordId
    ? updateRecordMutation.isPending
      ? "Saving record..."
      : "Save record"
    : createRecordMutation.isPending
      ? "Creating record..."
      : "Create record"

  return (
    <Form {...form}>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Record name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormDescription>
                This is the canonical envelope name for the record.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {schemaDefinition.fields
          .filter((field) => !field.isSystem)
          .map((field) => (
            <RecordContextFormField
              form={form}
              key={field.key}
              schemaField={field}
            />
          ))}
        <Button
          disabled={
            createRecordMutation.isPending || updateRecordMutation.isPending
          }
          type="submit"
        >
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
