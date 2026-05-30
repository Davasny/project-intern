type OpencodeSkillUploadProgressProps = {
  isUploading: boolean
  progress: number
  message: string | null
}

export const OpencodeSkillUploadProgress = ({
  isUploading,
  progress,
  message,
}: OpencodeSkillUploadProgressProps) => {
  if (!message) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="flex flex-row items-center justify-between">
        <span className="text-xs text-muted-foreground">{message}</span>
        {isUploading ? (
          <span className="text-xs text-muted-foreground">{progress}%</span>
        ) : null}
      </div>
      {isUploading ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}
