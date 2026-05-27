"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { invalidateRelationQueries } from "@/features/record-edges/lib/invalidate-relation-queries"
import {
  relationTypeRules,
  relationTypeValues,
} from "@/features/record-edges/lib/relation-type-rules"
import { useTRPC } from "@/lib/trpc/client"

const relationFormSchema = z.object({
  confidence: z.string().trim(),
  direction: z.enum(["outbound", "bidirectional"]),
  notes: z.string().trim().max(2000),
  recordEdgeId: z.string().uuid().nullable(),
  relationType: z.enum(relationTypeValues),
  source: z.string().trim().max(200),
  targetProjectSlug: z.string().trim().min(1, "Target project is required."),
  targetRecordId: z.string().uuid("Target record is required."),
})

type RelationFormValues = z.infer<typeof relationFormSchema>

type RelationFormProps = {
  initialValues: RelationFormValues
  onSubmitted: () => void
  recordId: string
}

const buildConfidenceValue = (confidence: string) => {
  if (confidence.length === 0) {
    return null
  }

  const parsedConfidence = Number(confidence)

  if (Number.isNaN(parsedConfidence)) {
    return null
  }

  return parsedConfidence
}

export const RelationForm = ({
  initialValues,
  onSubmitted,
  recordId,
}: RelationFormProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<RelationFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(relationFormSchema),
  })
  const targetProjectSlug = useWatch({
    control: form.control,
    name: "targetProjectSlug",
  })

  const projectsQuery = useQuery(
    trpc.projects.listForOrganization.queryOptions({ organizationSlug }),
  )
  const targetRecordsQuery = useQuery({
    ...trpc.records.list.queryOptions({
      organizationSlug,
      projectSlug: targetProjectSlug,
    }),
    enabled: targetProjectSlug.length > 0,
  })

  const createRelationMutation = useMutation(
    trpc.recordEdges.create.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateRelationQueries({
          queryClient,
          trpc,
          organizationSlug,
          projectSlug,
          recordId,
          targetProjectSlug: variables.input.targetProjectSlug,
          targetRecordId: variables.input.targetRecordId,
        })
        onSubmitted()
      },
    }),
  )
  const updateRelationMutation = useMutation(
    trpc.recordEdges.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateRelationQueries({
          queryClient,
          trpc,
          organizationSlug,
          projectSlug,
          recordId,
          targetProjectSlug: variables.input.targetProjectSlug,
          targetRecordId: variables.input.targetRecordId,
        })
        onSubmitted()
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      direction: values.direction,
      metadata: {
        confidence: buildConfidenceValue(values.confidence),
        notes: values.notes,
        source: values.source,
      },
      relationType: values.relationType,
      targetProjectSlug: values.targetProjectSlug,
      targetRecordId: values.targetRecordId,
    }

    if (values.recordEdgeId) {
      await updateRelationMutation.mutateAsync({
        input: {
          ...payload,
          recordEdgeId: values.recordEdgeId,
          recordId,
        },
        organizationSlug,
        projectSlug,
      })
      return
    }

    await createRelationMutation.mutateAsync({
      input: {
        ...payload,
        recordId,
      },
      organizationSlug,
      projectSlug,
    })
  })

  const availableTargetRecords =
    targetRecordsQuery.data?.filter(
      (targetRecord) => targetRecord.id !== recordId,
    ) ?? []
  const isPending =
    createRelationMutation.isPending || updateRelationMutation.isPending

  return (
    <Form {...form}>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="relationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relation type</FormLabel>
              <FormControl>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {relationTypeValues.map((relationType) => (
                        <SelectItem key={relationType} value={relationType}>
                          {relationTypeRules[relationType].label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                {relationTypeRules[field.value].description}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direction</FormLabel>
              <FormControl>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="bidirectional">
                        Bidirectional
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Bidirectional relations are still canonical edges with a single
                stored row.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetProjectSlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target project</FormLabel>
              <FormControl>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projectsQuery.data?.map((project) => (
                        <SelectItem key={project.id} value={project.slug}>
                          {project.displayName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetRecordId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target record</FormLabel>
              <FormControl>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a record" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableTargetRecords.map((targetRecord) => (
                        <SelectItem
                          key={targetRecord.id}
                          value={targetRecord.id}
                        >
                          {targetRecord.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Depth stays limited to one linked record in this phase.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source</FormLabel>
              <FormControl>
                <Input placeholder="Manual review" {...field} />
              </FormControl>
              <FormDescription>
                Stores where this relation came from for auditing.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confidence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confidence</FormLabel>
              <FormControl>
                <Input
                  max="1"
                  min="0"
                  placeholder="0.85"
                  step="0.01"
                  type="number"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional 0-1 confidence score stored in edge metadata.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Why this relation exists and how it was verified."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} type="submit">
          {initialValues.recordEdgeId
            ? isPending
              ? "Saving relation..."
              : "Save relation"
            : isPending
              ? "Creating relation..."
              : "Create relation"}
        </Button>
      </form>
    </Form>
  )
}
