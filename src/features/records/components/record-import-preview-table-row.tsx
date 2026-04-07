import {
  TableCell,
  TableRow,
} from "@/components/ui/table"
import type { RecordImportPreviewResult } from "@/features/records/schemas/record-import"

type RecordImportPreviewTableRowProps = {
  record: RecordImportPreviewResult["proposedRecords"][number]
}

export const RecordImportPreviewTableRow = ({
  record,
}: RecordImportPreviewTableRowProps) => {
  return (
    <TableRow>
      <TableCell>{record.rowNumber}</TableCell>
      <TableCell>{record.name}</TableCell>
      <TableCell>
        <pre className="max-w-[28rem] overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs">
          {JSON.stringify(record.context)}
        </pre>
      </TableCell>
    </TableRow>
  )
}
