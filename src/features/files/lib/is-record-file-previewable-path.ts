import { getRecordFilePreviewLanguage } from "@/features/files/lib/record-file-preview-language"

export const isRecordFilePreviewablePath = (filePath: string) =>
  getRecordFilePreviewLanguage(filePath) !== null
