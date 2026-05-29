"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFieldArray, useForm } from "react-hook-form"
import { Form } from "@/components/ui/form"
import { SchemaFieldTable } from "@/features/project-schema/components/schema-field-table"
import { SchemaVersionFormFooter } from "@/features/project-schema/components/schema-version-form-footer"
import { formatProjectSchemaDefaultValue } from "@/features/project-schema/lib/format-project-schema-default-value"
import { parseProjectSchemaDefaultValue } from "@/features/project-schema/lib/parse-project-schema-default-value"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import {
  schemaVersionFormSchema,
  type SchemaVersionFormValues,
} from "@/features/project-schema/schemas/schema-version-form-schema"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type SchemaVersionFormProps = {
  initialSchemaDefinition: ProjectSchemaDefinition
  onSuccess?: () => void
  totalRecordCount: number
}

const parseNumberValue = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  return Number(trimmedValue)
}

const getInitialFormValues = (
  initialSchemaDefinition: ProjectSchemaDefinition,
): SchemaVersionFormValues => ({
  fields: initialSchemaDefinition.fields
    .filter((field) => !field.isSystem)
    .map((field) => ({
      config: {
        enumOptions: field.config.enumOptions.join(", "),
        max: field.config.max === null ? "" : String(field.config.max),
        min: field.config.min === null ? "" : String(field.config.min),
        multilineRows:
          field.config.multilineRows === null
            ? ""
            : String(field.config.multilineRows),
      },
      defaultValue: formatProjectSchemaDefaultValue(field.defaultValue),
      description: field.description,
      key: field.key,
      label: field.label,
      required: field.required,
      type: field.type,
    })),
})

export const SchemaVersionForm = ({
  initialSchemaDefinition,
  onSuccess,
  totalRecordCount,
}: SchemaVersionFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<SchemaVersionFormValues>({
    defaultValues: getInitialFormValues(initialSchemaDefinition),
    resolver: zodResolver(schemaVersionFormSchema),
  })
  const fieldArray = useFieldArray({
    control: form.control,
    name: "fields",
  })
  const createVersionMutation = useMutation(
    trpc.projectSchema.createVersion.mutationOptions({
      onSuccess: async () => {
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
          trpc.projectSchema.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
        onSuccess?.()
      },
    }),
  )
  const createDraftMutation = useMutation(
    trpc.projectSchema.createDraft.mutationOptions({
      onSuccess: async () => {
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
          trpc.projectSchema.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
        onSuccess?.()
      },
    }),
  )

  const handleAddField = () => {
    fieldArray.append({
      config: {
        enumOptions: "",
        max: "",
        min: "",
        multilineRows: "",
      },
      defaultValue: "",
      description: "",
      key: "",
      label: "",
      required: false,
      type: "text",
    })
  }

  const buildCustomFieldsPayload = (values: SchemaVersionFormValues) =>
    values.fields.map((field) => {
      const isSystem: false = false

      return {
        config: {
          enumOptions: field.config.enumOptions
            .split(",")
            .map((option) => option.trim())
            .filter((option) => option.length > 0),
          max: parseNumberValue(field.config.max),
          min: parseNumberValue(field.config.min),
          multilineRows: parseNumberValue(field.config.multilineRows),
        },
        defaultValue: parseProjectSchemaDefaultValue({
          type: field.type,
          value: field.defaultValue,
        }),
        description: field.description,
        isSystem,
        key: field.key,
        label: field.label,
        required: field.required,
        type: field.type,
      }
    })

  const handleCreateVersion = form.handleSubmit(async (values) => {
    await createVersionMutation.mutateAsync({
      customFields: buildCustomFieldsPayload(values),
      organizationSlug,
      projectSlug,
    })
  })

  const handleCreateDraft = form.handleSubmit(async (values) => {
    await createDraftMutation.mutateAsync({
      customFields: buildCustomFieldsPayload(values),
      organizationSlug,
      projectSlug,
    })
  })

  const isSubmitting =
    createDraftMutation.isPending || createVersionMutation.isPending

  return (
    <Form {...form}>
      <form className="flex min-h-0 flex-col gap-4" onSubmit={handleCreateVersion}>
        <SchemaFieldTable
          fields={fieldArray.fields}
          form={form}
          onAddField={handleAddField}
          onRemoveField={fieldArray.remove}
        />
        <SchemaVersionFormFooter
          createDraftPending={createDraftMutation.isPending}
          createVersionPending={createVersionMutation.isPending}
          isSubmitting={isSubmitting}
          onCreateDraft={handleCreateDraft}
          totalRecordCount={totalRecordCount}
        />
      </form>
    </Form>
  )
}
