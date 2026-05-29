"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import {
  SchemaFieldForm,
  type SchemaVersionFormValues,
} from "@/features/project-schema/components/schema-field-form"
import { formatProjectSchemaDefaultValue } from "@/features/project-schema/lib/format-project-schema-default-value"
import { parseProjectSchemaDefaultValue } from "@/features/project-schema/lib/parse-project-schema-default-value"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

const schemaVersionFormSchema = z.object({
  fields: z.array(
    z.object({
      config: z.object({
        enumOptions: z.string(),
        max: z.string(),
        min: z.string(),
        multilineRows: z.string(),
      }),
      defaultValue: z.string(),
      description: z.string(),
      key: z.string().trim().min(1),
      label: z.string().trim().min(1),
      required: z.boolean(),
      type: z.enum([
        "text",
        "long_text",
        "number",
        "boolean",
        "date",
        "datetime",
        "url",
        "email",
        "enum",
        "json",
        "string_array",
        "number_array",
      ]),
    }),
  ),
})

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
    values.fields.map((field) => ({
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
      isSystem: false as const,
      key: field.key,
      label: field.label,
      required: field.required,
      type: field.type,
    }))

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
      <form className="flex flex-col gap-4" onSubmit={handleCreateVersion}>
        <Button
          className="self-start"
          onClick={handleAddField}
          type="button"
          variant="secondary"
        >
          Add field
        </Button>
        {fieldArray.fields.length > 0 ? (
          fieldArray.fields.map((field, index) => (
            <SchemaFieldForm
              control={form.control}
              form={form}
              index={index}
              key={field.id}
              onRemove={() => fieldArray.remove(index)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No custom fields yet. System fields are always included.
          </p>
        )}
        <div className="flex flex-row gap-2">
          <Button
            disabled={isSubmitting}
            onClick={handleCreateDraft}
            type="button"
            variant="outline"
          >
            {createDraftMutation.isPending
              ? totalRecordCount === 0
                ? "Saving draft..."
                : "Creating draft..."
              : totalRecordCount === 0
                ? "Save draft"
                : "Create draft"}
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {createVersionMutation.isPending
              ? totalRecordCount === 0
                ? "Applying changes..."
                : "Creating schema version..."
              : totalRecordCount === 0
                ? "Apply changes"
                : "Create schema version"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
