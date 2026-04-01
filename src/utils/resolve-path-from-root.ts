import path from "node:path"

type ResolvePathFromRootParams = {
  relativePath: string
  rootPath: string
}

export const resolvePathFromRoot = ({
  relativePath,
  rootPath,
}: ResolvePathFromRootParams) => {
  const normalizedRootPath = path.resolve(rootPath)
  const resolvedPath = path.resolve(normalizedRootPath, relativePath)
  const relativeToRootPath = path.relative(normalizedRootPath, resolvedPath)

  if (
    relativeToRootPath === ".." ||
    relativeToRootPath.startsWith(`..${path.sep}`)
  ) {
    throw new Error("Resolved path escapes the configured root path.")
  }

  return resolvedPath
}
