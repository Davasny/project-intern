import type { RecordImportPreviewResult } from "@/features/records/schemas/record-import"

type RecordImportErrorListItemProps = {
  error: RecordImportPreviewResult["errors"][number]
}

export const RecordImportErrorListItem = ({
  error,
}: RecordImportErrorListItemProps) => {
  const rowPrefix = error.rowNumber !== null ? `Row ${error.rowNumber}: ` : ""

  return <li>{`${rowPrefix}${error.message}`}</li>
}
