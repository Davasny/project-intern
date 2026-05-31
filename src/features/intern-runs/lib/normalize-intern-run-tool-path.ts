const normalizeSeparators = (value: string) => value.replaceAll("\\", "/")

export const normalizeInternRunToolPath = ({
  path,
  workspaceDirectory,
}: {
  path: string
  workspaceDirectory: string
}) => {
  const normalizedPath = normalizeSeparators(path)
  const normalizedWorkspaceDirectory = normalizeSeparators(
    workspaceDirectory,
  ).replace(/\/+$/, "")

  if (normalizedPath === normalizedWorkspaceDirectory) {
    return "."
  }

  if (normalizedPath.startsWith(`${normalizedWorkspaceDirectory}/`)) {
    return normalizedPath.slice(normalizedWorkspaceDirectory.length + 1)
  }

  return path
}
