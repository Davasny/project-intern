"use client"

import { useState } from "react"
import { EyeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecordFilePreviewDialog } from "@/features/files/components/record-file-preview-dialog"
import { isRecordFilePreviewablePath } from "@/features/files/lib/is-record-file-previewable-path"

type RecordFilePreviewButtonProps = {
  filePath: string
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const RecordFilePreviewButton = ({
  filePath,
  organizationSlug,
  projectSlug,
  recordId,
}: RecordFilePreviewButtonProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const isPreviewable = isRecordFilePreviewablePath(filePath)

  return isPreviewable ? (
    <>
      <Button
        aria-label={`Preview ${filePath}`}
        className="text-muted-foreground hover:text-primary"
        onClick={() => setIsPreviewOpen(true)}
        size="icon-xs"
        title="Preview file"
        type="button"
        variant="ghost"
      >
        <EyeIcon className="size-3.5" />
      </Button>
      <RecordFilePreviewDialog
        filePath={filePath}
        onOpenChange={setIsPreviewOpen}
        open={isPreviewOpen}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordId}
      />
    </>
  ) : null
}
