"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileUpIcon, InfoIcon } from "lucide-react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTable } from "@/components/ui/data-table/data-table"
import { RecordImportErrorListItem } from "@/features/records/components/record-import-error-list-item"
import { RecordImportPreviewTableRow } from "@/features/records/components/record-import-preview-table-row"
import type { RecordImportPreviewResult } from "@/features/records/schemas/record-import"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

const recordCsvImportFormSchema = z.object({
  file: z.instanceof(File).nullable(),
})

type RecordCsvImportFormValues = z.infer<typeof recordCsvImportFormSchema>

type RecordCsvImportDialogProps = {
  isOpen: boolean
  onOpenChange: (nextOpen: boolean) => void
}

const DEFAULT_FORM_VALUES: RecordCsvImportFormValues = {
  file: null,
}

const FIELD_TYPE_HINTS: Record<string, string> = {
  boolean: 'Accepted: "true", "false", "1", "0", "yes", "no" (case‑insensitive)',
  date: "Format: YYYY-MM-DD",
  datetime: 'Format: YYYY-MM-DDTHH:MM (e.g. "2026-05-27T14:30")',
  email: "A valid email address",
  enum: "Must match one of the configured enum options",
  json: "A single JSON object (e.g. {\"key\":\"value\"})",
  number: "A numeric value (integer or decimal)",
  number_array: "A JSON array of numbers (e.g. [1,2,3])",
  string_array: 'A JSON array of strings (e.g. ["alpha","beta"])',
  url: "A valid URL",
}

export const RecordCsvImportDialog = ({
  isOpen,
  onOpenChange,
}: RecordCsvImportDialogProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewResult, setPreviewResult] =
    useState<RecordImportPreviewResult | null>(null)

  const initialSchemaQuery = useQuery(
    trpc.projectSchema.getByVersion.queryOptions({
      organizationSlug,
      projectSlug,
      version: 1,
    }),
  )

  const form = useForm<RecordCsvImportFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
    resolver: zodResolver(recordCsvImportFormSchema),
  })

  const importPreviewMutation = useMutation(
    trpc.records.importPreview.mutationOptions({
      onSuccess: (result) => {
        setPreviewResult(result)
      },
    }),
  )

  const importCommitMutation = useMutation(
    trpc.records.importCommit.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )

        form.reset(DEFAULT_FORM_VALUES)
        setPreviewResult(null)
        onOpenChange(false)
      },
    }),
  )

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      form.reset(DEFAULT_FORM_VALUES)
      setPreviewResult(null)
      return
    }

    form.reset(DEFAULT_FORM_VALUES)
    setPreviewResult(null)
  }

  const handlePreviewSubmit = form.handleSubmit(async (values) => {
    if (!values.file) {
      form.setError("file", { message: "CSV file is required." })
      return
    }

    const csvContent = await values.file.text()

    await importPreviewMutation.mutateAsync({
      input: { csvContent },
      organizationSlug,
      projectSlug,
    })
  })

  const handleCommitImport = async () => {
    if (!previewResult || previewResult.summary.errorCount > 0) {
      return
    }

    await importCommitMutation.mutateAsync({
      input: {
        records: previewResult.proposedRecords,
      },
      organizationSlug,
      projectSlug,
    })
  }

  const handlePickAnotherFile = () => {
    setPreviewResult(null)
    form.reset(DEFAULT_FORM_VALUES)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const customFields = initialSchemaQuery.data
    ? initialSchemaQuery.data.schemaDefinition.fields.filter(
        (field) => !field.isSystem,
      )
    : []

  return (
    <Dialog onOpenChange={handleDialogOpenChange} open={isOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import records from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import records. The first row must be a header
            row. Each record is validated against schema version{" "}
            {initialSchemaQuery.data?.version ?? 1}.
          </DialogDescription>
        </DialogHeader>

        {previewResult ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {previewResult.summary.proposedCount} proposed,{" "}
              {previewResult.summary.errorCount} errors,{" "}
              {previewResult.summary.totalRows} total rows.
            </div>

            {previewResult.errors.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">
                  Import cannot continue. Fix the CSV and upload again.
                </p>
                <ul className="list-disc pl-6 text-sm text-destructive">
                  {previewResult.errors.map((error) => (
                    <RecordImportErrorListItem
                      error={error}
                      key={`${error.rowNumber ?? "global"}-${error.message}`}
                    />
                  ))}
                </ul>
              </div>
            ) : (
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableHeader>Row</TableHeader>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Context (JSON)</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewResult.proposedRecords.map((record) => (
                    <RecordImportPreviewTableRow
                      key={record.rowNumber}
                      record={record}
                    />
                  ))}
                </TableBody>
              </DataTable>
            )}

            <div className="flex flex-row justify-end gap-2">
              <Button
                onClick={handlePickAnotherFile}
                type="button"
                variant="outline"
              >
                Upload another file
              </Button>
              <Button
                disabled={
                  importCommitMutation.isPending ||
                  previewResult.errors.length > 0
                }
                onClick={handleCommitImport}
                type="button"
              >
                {importCommitMutation.isPending
                  ? "Importing..."
                  : "Confirm import"}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              className="flex flex-col gap-6"
              onSubmit={handlePreviewSubmit}
            >
              {initialSchemaQuery.isLoading ? (
                <LoadingState
                  label="Loading schema columns..."
                  variant="spinner"
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
                    Required columns
                  </div>
                  <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">name</span>{" "}
                      — The record name (must be unique in this project).
                    </li>
                  </ul>

                  {customFields.length > 0 ? (
                    <>
                      <div className="mt-2 font-medium text-foreground">
                        Optional columns (schema version{" "}
                        {initialSchemaQuery.data?.version ?? 1})
                      </div>
                      <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
                        {customFields.map((field) => (
                          <li key={field.key}>
                            <span className="font-medium text-foreground">
                              {field.key}
                            </span>{" "}
                            — {field.label}
                            {field.required ? (
                              <span className="text-tone-danger-foreground">
                                {" "}
                                (required)
                              </span>
                            ) : (
                              ""
                            )}
                            <br />
                            <span className="text-xs">
                              Type: {field.type}.{" "}
                              {FIELD_TYPE_HINTS[field.type] ??
                                "Plain text value."}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No custom fields are defined in this project&rsquo;s
                      schema. Only the <code>name</code> column is expected.
                    </p>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSV file</FormLabel>
                    <FormControl>
                      <input
                        accept=".csv,text/csv"
                        className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null
                          field.onChange(nextFile)
                        }}
                        ref={fileInputRef}
                        type="file"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {importPreviewMutation.error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {importPreviewMutation.error.message}
                </div>
              ) : null}
              <div className="flex flex-row justify-end gap-2">
                <Button
                  onClick={() => handleDialogOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={importPreviewMutation.isPending} type="submit">
                  <FileUpIcon className="mr-1.5 size-4" />
                  {importPreviewMutation.isPending
                    ? "Preparing preview..."
                    : "Upload and preview"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
