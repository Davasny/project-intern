const sanitizeTaskTitleForFilename = (title: string) => {
  const sanitizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return sanitizedTitle.length > 0 ? sanitizedTitle : "task"
}

export const buildTaskDescriptionDownloadFilename = ({
  sortOrder,
  title,
}: {
  sortOrder: number
  title: string
}) => `${sortOrder}-${sanitizeTaskTitleForFilename(title)}.md`
