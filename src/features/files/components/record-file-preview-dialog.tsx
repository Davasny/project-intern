"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { CodeblockShiki } from "@/components/code-block/code-block-shiki"
import type { RecordFilePreviewLanguage } from "@/features/files/lib/record-file-preview-language"
import { useTRPC } from "@/lib/trpc/client"
import type { Languages } from "@/utils/shiki/highlight"
import { formatFileSize } from "@/utils/format-file-size"

type RecordFilePreviewDialogProps = {
  filePath: string
  open: boolean
  organizationSlug: string
  projectSlug: string
  recordId: string
  onOpenChange: (open: boolean) => void
}

const isHighlightedPreviewLanguage = (
  language: RecordFilePreviewLanguage,
): language is Languages => language !== "text"

export const RecordFilePreviewDialog = ({
  filePath,
  open,
  organizationSlug,
  projectSlug,
  recordId,
  onOpenChange,
}: RecordFilePreviewDialogProps) => {
  const trpc = useTRPC()
  const previewQuery = useQuery({
    ...trpc.files.preview.queryOptions({
      organizationSlug,
      path: filePath,
      projectSlug,
      recordId,
    }),
    enabled: open,
  })

  const preview = previewQuery.data

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-border border-b px-5 py-4">
          <DialogTitle className="font-mono text-sm">
            {preview?.name ?? filePath}
          </DialogTitle>
          <DialogDescription>
            {preview ? (
              <span className="flex flex-row flex-wrap gap-2 text-xs">
                <span>{preview.path}</span>
                <span>·</span>
                <span>{formatFileSize(preview.sizeBytes)}</span>
                <span>·</span>
                <span>{preview.updatedAt.toLocaleString()}</span>
              </span>
            ) : (
              "Loading source file preview."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(85vh-6rem)] overflow-auto bg-background p-4">
          {previewQuery.isLoading ? (
            <LoadingState label="Loading preview..." />
          ) : previewQuery.isError ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {previewQuery.error.message}
            </div>
          ) : preview ? (
            isHighlightedPreviewLanguage(preview.language) ? (
              <CodeblockShiki
                code={preview.content}
                fontSize="xs"
                language={preview.language}
                lineNumbers
              />
            ) : (
              <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-words">
                {preview.content}
              </pre>
            )
          ) : (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Preview could not be loaded.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
