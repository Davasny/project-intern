import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"

type ExecutionMatrixAddRecordRowProps = {
  onAddRecord: () => void
  taskCount: number
}

export const ExecutionMatrixAddRecordRow = ({
  onAddRecord,
  taskCount,
}: ExecutionMatrixAddRecordRowProps) => (
  <TableRow className="border-t-2 border-dashed border-border bg-muted/30">
    <TableCell className="sticky left-0 z-10 min-w-56 bg-muted/30 font-medium">
      <Button
        className="text-muted-foreground hover:text-foreground"
        onClick={onAddRecord}
        size="sm"
        type="button"
        variant="ghost"
      >
        <PlusIcon className="size-3.5" />
        Add record
      </Button>
    </TableCell>
    {Array.from({ length: taskCount }, (_, index) => (
      <TableCell className="min-w-40" key={index} />
    ))}
    <TableCell className="min-w-40 border-l-2 border-dashed border-border" />
  </TableRow>
)
