"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Upload } from "lucide-react"
import { type ChangeEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { RecordFileTree } from "@/features/files/components/record-file-tree"
import { uploadRecordFiles } from "@/lib/api/upload-record-files"
import { useTRPC } from "@/lib/trpc/client"

type RecordFilePanelProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
}

type UploadState = {
  isUploading: boolean
  progress: number
  message: string | null
}

export const RecordFilePanel = ({
  organizationSlug,
  projectSlug,
  recordId,
}: RecordFilePanelProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    message: null,
  })

  const filesQuery = useQuery(
    trpc.files.list.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )

  const handleUploadFiles = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files

    if (!files || files.length === 0) return

    setUploadState({
      isUploading: true,
      progress: 0,
      message: `Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`,
    })

    try {
      const result = await uploadRecordFiles({
        recordId,
        files,
        onProgress: (progress) => {
          setUploadState((prev) => ({ ...prev, progress }))
        },
      })

      const uploadedCount = result.uploaded.length
      const errorCount = result.errors.length

      let message: string
      if (errorCount === 0) {
        message = `Successfully uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""}.`
      } else {
        message = `Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""}, ${errorCount} failed.`
      }

      setUploadState({
        isUploading: false,
        progress: 100,
        message,
      })

      // Refresh the file list
      await queryClient.invalidateQueries(
        trpc.files.list.queryOptions({
          organizationSlug,
          projectSlug,
          recordId,
        }),
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during upload."

      setUploadState({
        isUploading: false,
        progress: 0,
        message,
      })
    } finally {
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  if (filesQuery.isLoading) {
    return <LoadingState label="Loading record files..." />
  }

  const { nodes, storageRoot } = filesQuery.data ?? {
    nodes: [],
    storageRoot: null,
  }

  return (
    <SectionCard>
      <SectionCardHeader>
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-foreground">
              Source files
            </h2>
            <p className="text-sm text-muted-foreground">
              Files are listed directly from canonical storage and copied 1:1
              into the record workspace when execution starts.
            </p>
          </div>
          <div className="flex flex-row items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is not in TypeScript types but supported by browsers
              webkitdirectory=""
              className="hidden"
              onChange={handleUploadFiles}
              disabled={uploadState.isUploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState.isUploading}
            >
              <Upload className="mr-1.5 size-3.5" />
              Upload folder
            </Button>
          </div>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="flex flex-col gap-4">
        {uploadState.isUploading ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {uploadState.message}
              </span>
              <span className="text-xs text-muted-foreground">
                {uploadState.progress}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>
        ) : uploadState.message ? (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {uploadState.message}
            </span>
          </div>
        ) : null}
        {storageRoot ? (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Storage path:{" "}
            </span>
            <code className="text-xs font-mono text-foreground">
              {storageRoot}
            </code>
          </div>
        ) : null}
        {nodes.length > 0 ? (
          <RecordFileTree
            nodes={nodes}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            recordId={recordId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No files in record storage.
          </p>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
