import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableHeader } from "@/components/ui/table"

type ExecutionMatrixAddTaskHeaderProps = {
  onAddTask: () => void
}

export const ExecutionMatrixAddTaskHeader = ({
  onAddTask,
}: ExecutionMatrixAddTaskHeaderProps) => (
  <TableHeader className="min-w-40 border-l-2 border-dashed border-border px-4 py-3">
    <Button
      className="text-muted-foreground hover:text-foreground"
      onClick={onAddTask}
      size="sm"
      type="button"
      variant="ghost"
    >
      <PlusIcon className="size-3.5" />
      Add task
    </Button>
  </TableHeader>
)
