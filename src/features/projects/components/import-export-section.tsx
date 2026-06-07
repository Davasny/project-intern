"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { DownloadIcon, UploadIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { ProjectImportDialog } from "@/features/projects/components/project-import-dialog"
import { useTRPC } from "@/lib/trpc/client"

const exportOptionsSchema = z.object({
  exportTasks: z.boolean(),
  exportRecords: z.boolean(),
  exportSchemaVersions: z.boolean(),
  exportProjectSettings: z.boolean(),
})

type ExportOptionsFormValues = z.infer<typeof exportOptionsSchema>

const DEFAULT_EXPORT_VALUES: ExportOptionsFormValues = {
  exportProjectSettings: true,
  exportRecords: true,
  exportSchemaVersions: true,
  exportTasks: true,
}

const exportCheckboxItems = [
  {
    name: "exportTasks" as const,
    label: "Tasks",
    description:
      "All tasks with their descriptions, model settings, and sort order.",
  },
  {
    name: "exportRecords" as const,
    label: "Records",
    description: "All records with their names and context data.",
  },
  {
    name: "exportSchemaVersions" as const,
    label: "Schema settings",
    description: "Accepted schema version field definitions.",
  },
  {
    name: "exportProjectSettings" as const,
    label: "Runtime settings",
    description:
      "Default model, temperature, autopick, and Python requirements.",
  },
]

export const ImportExportSection = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const form = useForm<ExportOptionsFormValues>({
    defaultValues: DEFAULT_EXPORT_VALUES,
    resolver: zodResolver(exportOptionsSchema),
  })

  const handleExportSubmit = form.handleSubmit(async (values) => {
    const hasSelection =
      values.exportTasks ||
      values.exportRecords ||
      values.exportSchemaVersions ||
      values.exportProjectSettings

    if (!hasSelection) {
      return
    }

    setIsExporting(true)

    const data = await queryClient.fetchQuery(
      trpc.projects.exportData.queryOptions({
        exportOptions: {
          exportProjectSettings: values.exportProjectSettings,
          exportRecords: values.exportRecords,
          exportSchemaVersions: values.exportSchemaVersions,
          exportTasks: values.exportTasks,
        },
        organizationSlug,
        projectSlug,
      }),
    )

    setIsExporting(false)

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${projectSlug}-export-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  })

  const exportLabel = isExporting ? "Exporting..." : "Download JSON"

  return (
    <>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground">Export</h3>
          <p className="text-sm text-muted-foreground">
            Select what to include in the export file. The file can be imported
            into another project.
          </p>
          <Form {...form}>
            <form
              className="flex flex-col gap-6"
              onSubmit={handleExportSubmit}
            >
              <div className="flex flex-col gap-3">
                {exportCheckboxItems.map((item) => (
                  <FormField
                    control={form.control}
                    key={item.name}
                    name={item.name}
                    render={({ field }) => (
                      <FormItem>
                        <label
                          className="flex cursor-pointer flex-row items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                          htmlFor={`export-${item.name}`}
                        >
                          <FormControl>
                            <input
                              checked={field.value}
                              className="mt-0.5 size-4 shrink-0 rounded border-border accent-foreground"
                              id={`export-${item.name}`}
                              onChange={(e) =>
                                field.onChange(e.target.checked)
                              }
                              type="checkbox"
                            />
                          </FormControl>
                          <div className="flex flex-col gap-1">
                            <FormLabel className="cursor-pointer">
                              {item.label}
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </label>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-end">
                <Button disabled={isExporting} type="submit">
                  <DownloadIcon className="mr-1.5 size-4" />
                  {exportLabel}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground">Import</h3>
          <p className="text-sm text-muted-foreground">
            Import data from a previously exported JSON file. Conflicting
            records can be overwritten or skipped. Duplicate tasks will be
            skipped. Schema versions can be appended or overwritten during
            import.
          </p>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Upload a{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                .json
              </code>{" "}
              file previously exported from another project.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={() => setIsImportOpen(true)}
                type="button"
                variant="outline"
              >
                <UploadIcon className="mr-1.5 size-4" />
                Import JSON
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ProjectImportDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </>
  )
}
