import type { Languages } from "@/utils/shiki/highlight"

const languageByExtension = new Map<string, Languages>([
  [".bash", "bash"],
  [".css", "css"],
  [".html", "html"],
  [".js", "js"],
  [".json", "json"],
  [".jsonl", "json"],
  [".jsx", "js"],
  [".md", "mdx"],
  [".mdx", "mdx"],
  [".py", "python"],
  [".sh", "bash"],
  [".sql", "sql"],
  [".ts", "ts"],
  [".tsx", "tsx"],
  [".xml", "html"],
  [".yaml", "yaml"],
  [".yml", "yaml"],
])

export const getInternRunToolDisplayLanguage = (filePath: string | null) => {
  if (!filePath) {
    return null
  }

  const lastPathSegment = filePath.split("/").at(-1) ?? filePath
  const extensionStart = lastPathSegment.lastIndexOf(".")
  const extension =
    extensionStart >= 0
      ? lastPathSegment.slice(extensionStart).toLowerCase()
      : ""

  return languageByExtension.get(extension) ?? null
}
