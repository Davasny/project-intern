"use client"

import { useQuery } from "@tanstack/react-query"
import { FileList } from "@/components/ui/file-list/file-list"
import { FileListItem } from "@/components/ui/file-list/file-list-item"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { FileUploadForm } from "@/features/files/components/file-upload-form"
import { useTRPC } from "@/lib/trpc/client"
import { formatFileSize } from "@/utils/format-file-size"

type RecordFilePanelProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const RecordFilePanel = ({
  organizationSlug,
  projectSlug,
  recordId,
}: RecordFilePanelProps) => {
  const trpc = useTRPC()
  const filesQuery = useQuery(
    trpc.files.list.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )

  if (filesQuery.isLoading) {
    return <LoadingState label="Loading record files..." />
  }

  return (
    <SectionCard>
      <SectionCardHeader>
        <h2 className="text-lg font-semibold text-slate-950">Source files</h2>
        <p className="text-sm text-slate-500">
          Canonical files live under CRM_STORAGE_ROOT and hydrate into the long-
          lived record workspace when execution starts.
        </p>
      </SectionCardHeader>
      <SectionCardContent className="flex flex-col gap-6">
        <FileUploadForm
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          recordId={recordId}
        />
        {filesQuery.data && filesQuery.data.length > 0 ? (
          <FileList>
            {filesQuery.data.map((file) => (
              <FileListItem
                key={file.id}
                meta={`${formatFileSize(file.sizeBytes)} · ${file.mimeType} · ${file.createdAt.toLocaleString()}`}
                title={file.originalFileName}
              />
            ))}
          </FileList>
        ) : (
          <p className="text-sm text-slate-500">No source files registered.</p>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
