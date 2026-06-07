"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileUpIcon } from "lucide-react"
import type { ChangeEvent } from "react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
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
} from "@/components/ui/form"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import type {
  ProjectExportData,
  ProjectImportPreviewResult,
  SchemaImportMode,
} from "@/features/projects/schemas/project-export-data"
import { schemaImportModeSchema } from "@/features/projects/schemas/project-export-data"
import { useTRPC } from "@/lib/trpc/client"

type ProjectImportDialogProps = {
  isOpen: boolean
  onOpenChange: (nextOpen: boolean) => void
}

const importSelectionSchema = z.object({
  importTasks: z.boolean(),
  importRecords: z.boolean(),
  importSchemaVersions: z.boolean(),
  importProjectSettings: z.boolean(),
  recordNamesToOverride: z.array(z.string().trim().min(1)),
  schemaImportMode: schemaImportModeSchema,
})

type ImportSelectionValues = z.infer<typeof importSelectionSchema>

const DEFAULT_SELECTION: ImportSelectionValues = {
  importProjectSettings: false,
  importRecords: false,
  importSchemaVersions: false,
  importTasks: false,
  recordNamesToOverride: [],
  schemaImportMode: "append_as_new_versions",
}

const buildInitialSelection = (
  preview: ProjectImportPreviewResult,
): ImportSelectionValues => ({
  importProjectSettings: preview.summary.hasProjectSettings,
  importRecords: preview.summary.recordsFound > 0,
  importSchemaVersions: preview.summary.schemaVersionsFound > 0,
  importTasks: preview.summary.tasksFound > 0,
  recordNamesToOverride: [],
  schemaImportMode: "append_as_new_versions",
})

const buildCommitData = (
  preview: ProjectImportPreviewResult,
  selection: ImportSelectionValues,
): ProjectExportData["data"] => ({
  projectSettings: selection.importProjectSettings
    ? preview.data.projectSettings
    : undefined,
  records: selection.importRecords ? preview.data.records : undefined,
  schemaVersions: selection.importSchemaVersions
    ? preview.data.schemaVersions
    : undefined,
  tasks: selection.importTasks ? preview.data.tasks : undefined,
})

const importCheckboxItems = [
  {
    name: "importTasks" as const,
    label: "Tasks",
  },
  {
    name: "importRecords" as const,
    label: "Records",
  },
  {
    name: "importSchemaVersions" as const,
    label: "Schema settings",
  },
  {
    name: "importProjectSettings" as const,
    label: "Runtime settings",
  },
]

const schemaImportModeItems: {
  description: string
  label: string
  name: SchemaImportMode
}[] = [
  {
    description:
      "Keep current schemas intact and import file schemas after the latest version.",
    label: "Append as new versions",
    name: "append_as_new_versions",
  },
  {
    description:
      "Replace existing schemas with the same version numbers from the file.",
    label: "Overwrite matching versions",
    name: "overwrite_existing_versions",
  },
]

export const ProjectImportDialog = ({
  isOpen,
  onOpenChange,
}: ProjectImportDialogProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewResult, setPreviewResult] =
    useState<ProjectImportPreviewResult | null>(null)

  const selectionForm = useForm<ImportSelectionValues>({
    defaultValues: DEFAULT_SELECTION,
    resolver: zodResolver(importSelectionSchema),
  })

  const importPreviewMutation = useMutation(
    trpc.projects.importPreview.mutationOptions({
      onSuccess: (result) => {
        setPreviewResult(result)
        selectionForm.reset(buildInitialSelection(result))
      },
    }),
  )

  const importCommitMutation = useMutation(
    trpc.projects.importCommit.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.tasks.list.queryFilter({ organizationSlug, projectSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.projectSchema.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.projects.getSettings.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )

        setPreviewResult(null)
        selectionForm.reset(DEFAULT_SELECTION)
        onOpenChange(false)

        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      },
    }),
  )

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      setPreviewResult(null)
      selectionForm.reset(DEFAULT_SELECTION)
      return
    }

    setPreviewResult(null)
    selectionForm.reset(DEFAULT_SELECTION)
  }

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const fileContent = await file.text()

    await importPreviewMutation.mutateAsync({
      fileContent,
      organizationSlug,
      projectSlug,
    })
  }

  const handleCommitImport = async () => {
    if (!previewResult) {
      return
    }

    const selection = selectionForm.getValues()
    const commitData = buildCommitData(previewResult, selection)

    await importCommitMutation.mutateAsync({
      input: {
        data: commitData,
        recordNamesToOverride: selection.recordNamesToOverride,
        schemaImportMode: selection.schemaImportMode,
      },
      organizationSlug,
      projectSlug,
    })
  }

  const handlePickAnotherFile = () => {
    setPreviewResult(null)
    selectionForm.reset(DEFAULT_SELECTION)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const selectedCount =
    (selectionForm.watch("importTasks") ? 1 : 0) +
    (selectionForm.watch("importRecords") ? 1 : 0) +
    (selectionForm.watch("importSchemaVersions") ? 1 : 0) +
    (selectionForm.watch("importProjectSettings") ? 1 : 0)

  const shouldShowSchemaImportMode =
    previewResult &&
    previewResult.summary.schemaVersionsFound > 0 &&
    selectionForm.watch("importSchemaVersions")
  const selectedRecordNamesToOverride = selectionForm.watch(
    "recordNamesToOverride",
  )
  const shouldShowRecordConflictControls =
    previewResult && previewResult.recordConflicts.length > 0
  const recordConflictNames = previewResult
    ? previewResult.recordConflicts.map((conflict) => conflict.name)
    : []
  const areAllRecordConflictsSelected =
    recordConflictNames.length > 0 &&
    recordConflictNames.every((name) =>
      selectedRecordNamesToOverride.includes(name),
    )

  const toggleRecordOverride = (name: string, checked: boolean) => {
    const currentNames = selectionForm.getValues("recordNamesToOverride")

    if (checked) {
      selectionForm.setValue("recordNamesToOverride", [
        ...new Set([...currentNames, name]),
      ])
      return
    }

    selectionForm.setValue(
      "recordNamesToOverride",
      currentNames.filter((currentName) => currentName !== name),
    )
  }

  const toggleAllRecordOverrides = (checked: boolean) => {
    selectionForm.setValue(
      "recordNamesToOverride",
      checked ? recordConflictNames : [],
    )
  }

  return (
    <Dialog onOpenChange={handleDialogOpenChange} open={isOpen}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import project data</DialogTitle>
          <DialogDescription>
            Upload a JSON file exported from another project. Select what to
            import, choose conflict handling, then confirm. Duplicate tasks will
            be skipped.
          </DialogDescription>
        </DialogHeader>

        {importPreviewMutation.isPending ? (
          <LoadingState label="Analyzing import file..." variant="spinner" />
        ) : previewResult ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {previewResult.summary.tasksFound > 0
                ? `${previewResult.summary.tasksFound} tasks, `
                : ""}
              {previewResult.summary.recordsFound} records,{" "}
              {previewResult.summary.schemaVersionsFound} schema versions
              {previewResult.summary.hasProjectSettings
                ? ", project settings"
                : ""}{" "}
              found in file.
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                Select what to import
              </p>
              <Form {...selectionForm}>
                <div className="flex flex-col gap-2">
                  {importCheckboxItems.map((item) => (
                    <FormField
                      control={selectionForm.control}
                      key={item.name}
                      name={item.name}
                      render={({ field }) => (
                        <FormItem>
                          <label
                            className="flex cursor-pointer flex-row items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
                            htmlFor={`import-${item.name}`}
                          >
                            <FormControl>
                              <input
                                checked={field.value}
                                className="size-4 shrink-0 rounded border-border accent-foreground"
                                id={`import-${item.name}`}
                                onChange={(e) =>
                                  field.onChange(e.target.checked)
                                }
                                type="checkbox"
                              />
                            </FormControl>
                            <span className="cursor-pointer text-sm">
                              {item.label}
                            </span>
                          </label>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                {shouldShowSchemaImportMode ? (
                  <div className="flex flex-col gap-3 border-border border-t pt-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">
                        Schema import strategy
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Choose how imported schema versions interact with the
                        schemas already in this project.
                      </p>
                    </div>
                    <FormField
                      control={selectionForm.control}
                      name="schemaImportMode"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {schemaImportModeItems.map((item) => (
                              <label
                                className="flex cursor-pointer flex-row items-start gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/50 has-checked:border-foreground"
                                htmlFor={`schema-import-mode-${item.name}`}
                                key={item.name}
                              >
                                <FormControl>
                                  <input
                                    checked={field.value === item.name}
                                    className="mt-0.5 size-4 shrink-0 accent-foreground"
                                    id={`schema-import-mode-${item.name}`}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    onChange={() => field.onChange(item.name)}
                                    type="radio"
                                  />
                                </FormControl>
                                <div className="flex flex-col gap-1">
                                  <FormLabel className="cursor-pointer text-sm">
                                    {item.label}
                                  </FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}
              </Form>
            </div>

            {previewResult.warnings.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-md border border-tone-warning/30 bg-tone-warning/10 p-3">
                <p className="text-sm font-medium text-tone-warning-foreground">
                  Warnings
                </p>
                <DataTable>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Entity</TableHeader>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Message</TableHeader>
                      {shouldShowRecordConflictControls ? (
                        <TableHeader>
                          <label className="flex cursor-pointer flex-row items-center gap-2">
                            <input
                              aria-label="Select all record conflicts to overwrite"
                              checked={areAllRecordConflictsSelected}
                              className="size-4 rounded border-border accent-foreground"
                              onChange={(event) =>
                                toggleAllRecordOverrides(event.target.checked)
                              }
                              type="checkbox"
                            />
                            <span>Override</span>
                          </label>
                        </TableHeader>
                      ) : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewResult.warnings.map((warning, index) => {
                      const isRecordConflict = recordConflictNames.includes(
                        warning.name,
                      )
                      const isSelected = selectedRecordNamesToOverride.includes(
                        warning.name,
                      )

                      return (
                        <TableRow
                          key={`${warning.entityType}-${warning.name}-${index}`}
                        >
                          <TableCell className="text-sm">
                            {warning.entityType === "record"
                              ? "Record"
                              : warning.entityType === "task"
                                ? "Task"
                                : "Schema version"}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {warning.name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {warning.message}
                          </TableCell>
                          {shouldShowRecordConflictControls ? (
                            <TableCell className="text-sm text-muted-foreground">
                              {isRecordConflict ? (
                                <input
                                  aria-label={`Overwrite ${warning.name}`}
                                  checked={isSelected}
                                  className="size-4 rounded border-border accent-foreground"
                                  onChange={(event) =>
                                    toggleRecordOverride(
                                      warning.name,
                                      event.target.checked,
                                    )
                                  }
                                  type="checkbox"
                                />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </DataTable>
              </div>
            ) : null}

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
                  importCommitMutation.isPending || selectedCount === 0
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
              <p className="text-muted-foreground">
                The JSON file should contain a{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  formatVersion
                </code>{" "}
                field set to{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  1
                </code>{" "}
                with{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  data.tasks
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  data.records
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  data.schemaVersions
                </code>
                , and/or{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  data.projectSettings
                </code>{" "}
                sections.
              </p>
            </div>

            <input
              accept=".json,application/json"
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />

            {importPreviewMutation.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {importPreviewMutation.error.message}
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
