import type { Languages } from "@/utils/shiki/highlight"

export type RecordFilePreviewLanguage = Languages | "text"

const previewLanguageByExtension = new Map<string, RecordFilePreviewLanguage>([
  [".bash", "bash"],
  [".css", "css"],
  [".csv", "text"],
  [".html", "html"],
  [".js", "js"],
  [".json", "json"],
  [".jsonl", "json"],
  [".jsx", "js"],
  [".log", "text"],
  [".md", "mdx"],
  [".mdx", "mdx"],
  [".py", "text"],
  [".sh", "bash"],
  [".sql", "text"],
  [".ts", "ts"],
  [".tsx", "tsx"],
  [".txt", "text"],
  [".xml", "html"],
  [".yaml", "text"],
  [".yml", "text"],
])

export const getRecordFilePreviewLanguage = (
  filePath: string,
): RecordFilePreviewLanguage | null => {
  const lastPathSegment = filePath.split("/").at(-1) ?? filePath
  const extensionStart = lastPathSegment.lastIndexOf(".")
  const extension =
    extensionStart >= 0
      ? lastPathSegment.slice(extensionStart).toLowerCase()
      : ""

  return previewLanguageByExtension.get(extension) ?? null
}
